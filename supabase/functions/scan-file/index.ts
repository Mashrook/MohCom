import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  filePath: string;
  bucket: string;
  fileName: string;
}

// Known malicious patterns to scan for
const MALICIOUS_PATTERNS = [
  // Script injection
  /\b(?:eval|exec|system|passthru|shell_exec)\s*\(/gi,
  // VBA macros
  /\b(?:AutoOpen|AutoExec|Document_Open|Workbook_Open)\b/gi,
  // PowerShell
  /\b(?:powershell|cmd\.exe|wscript|cscript)\b/gi,
  // Embedded scripts
  /<script[\s>]/gi,
  /javascript\s*:/gi,
  // URL-based attacks
  /\b(?:data:text\/html|data:application\/javascript)\b/gi,
  // Known exploit signatures
  /\x00\x00\x00\x00JFIF/g, // Polyglot JPEG
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filePath, bucket, fileName }: ScanRequest = await req.json();

    if (!filePath || !bucket) {
      return new Response(
        JSON.stringify({ error: 'filePath and bucket are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs
    if (filePath.includes('..') || filePath.includes('//')) {
      return new Response(
        JSON.stringify({ safe: false, reason: 'Invalid file path detected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Download file from storage for scanning
    const downloadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
    const downloadResp = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
    });

    if (!downloadResp.ok) {
      return new Response(
        JSON.stringify({ safe: false, reason: 'Could not access file for scanning' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileBuffer = await downloadResp.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    // Size check (max 50MB for scanning)
    if (fileBytes.length > 50 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ safe: false, reason: 'File too large for scanning' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const issues: string[] = [];

    // 1. Check for embedded executables
    const exeSignatures = [
      [0x4D, 0x5A], // MZ (PE executable)
      [0x7F, 0x45, 0x4C, 0x46], // ELF
    ];
    
    for (const sig of exeSignatures) {
      // Check at beginning and also scan for embedded ones
      for (let offset = 0; offset < Math.min(fileBytes.length, 1024 * 100); offset += 512) {
        let match = true;
        for (let i = 0; i < sig.length; i++) {
          if (offset + i >= fileBytes.length || fileBytes[offset + i] !== sig[i]) {
            match = false;
            break;
          }
        }
        if (match && offset > 0) {
          issues.push(`Embedded executable detected at offset ${offset}`);
          break;
        }
      }
    }

    // 2. Scan text content for malicious patterns (first 100KB)
    const scanSize = Math.min(fileBytes.length, 100 * 1024);
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const textContent = textDecoder.decode(fileBytes.slice(0, scanSize));

    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(textContent)) {
        issues.push(`Suspicious pattern detected: ${pattern.source}`);
        pattern.lastIndex = 0; // Reset regex
      }
    }

    // 3. Check for zip bombs (compressed files with extreme ratio)
    if (fileBytes[0] === 0x50 && fileBytes[1] === 0x4B) {
      // It's a ZIP file - check for unreasonable file counts
      let fileCount = 0;
      for (let i = 0; i < fileBytes.length - 4; i++) {
        if (fileBytes[i] === 0x50 && fileBytes[i + 1] === 0x4B &&
            fileBytes[i + 2] === 0x01 && fileBytes[i + 3] === 0x02) {
          fileCount++;
        }
      }
      if (fileCount > 1000) {
        issues.push(`Potential zip bomb: ${fileCount} files detected in archive`);
      }
    }

    const isSafe = issues.length === 0;

    // Log the scan result
    console.log(`File scan: ${fileName || filePath} - ${isSafe ? 'SAFE' : 'SUSPICIOUS'} - ${issues.length} issues`);

    return new Response(
      JSON.stringify({
        safe: isSafe,
        issues: isSafe ? [] : issues,
        reason: isSafe ? null : issues[0],
        scannedBytes: scanSize,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scan error:', error);
    return new Response(
      JSON.stringify({ safe: false, reason: 'Scan error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
