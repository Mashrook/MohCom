import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle, Video, Phone, Search, RefreshCw, Eye,
  User, Calendar, Clock, Shield, AlertTriangle, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MessageWithUsers {
  id: string;
  sender_id: string;
  receiver_id: string;
  content_encrypted: string | null;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_email?: string;
  receiver_name?: string;
  receiver_email?: string;
}

interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: string;
  room_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  caller_name?: string;
  receiver_name?: string;
}

interface ConversationThread {
  participant1: { id: string; name: string; email: string };
  participant2: { id: string; name: string; email: string };
  messages: MessageWithUsers[];
  lastMessageAt: string;
}

const CommunicationMonitoring = () => {
  const [messages, setMessages] = useState<MessageWithUsers[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationThread | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch user profiles
      const userIds = new Set<string>();
      data?.forEach(msg => {
        userIds.add(msg.sender_id);
        userIds.add(msg.receiver_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Get emails for users
      const emailMap = new Map<string, string>();
      for (const userId of userIds) {
        try {
          const { data: email } = await supabase.rpc('get_user_email_for_admin', {
            target_user_id: userId,
          });
          if (email) emailMap.set(userId, email);
        } catch {}
      }

      const messagesWithUsers = data?.map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id) || 'غير معروف',
        sender_email: emailMap.get(msg.sender_id) || '',
        receiver_name: profileMap.get(msg.receiver_id) || 'غير معروف',
        receiver_email: emailMap.get(msg.receiver_id) || '',
      })) || [];

      setMessages(messagesWithUsers);

      // Group into conversations
      const convMap = new Map<string, ConversationThread>();
      messagesWithUsers.forEach(msg => {
        const key = [msg.sender_id, msg.receiver_id].sort().join('-');
        if (!convMap.has(key)) {
          convMap.set(key, {
            participant1: { id: msg.sender_id, name: msg.sender_name || '', email: msg.sender_email || '' },
            participant2: { id: msg.receiver_id, name: msg.receiver_name || '', email: msg.receiver_email || '' },
            messages: [],
            lastMessageAt: msg.created_at,
          });
        }
        convMap.get(key)!.messages.push(msg);
      });

      const convList = Array.from(convMap.values()).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      setConversations(convList);

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الرسائل',
        variant: 'destructive',
      });
    }
  };

  const fetchCallLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch user profiles
      const userIds = new Set<string>();
      data?.forEach(call => {
        userIds.add(call.caller_id);
        userIds.add(call.receiver_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const callsWithUsers = data?.map(call => ({
        ...call,
        caller_name: profileMap.get(call.caller_id) || 'غير معروف',
        receiver_name: profileMap.get(call.receiver_id) || 'غير معروف',
      })) || [];

      setCallLogs(callsWithUsers);
    } catch (error) {
      console.error('Error fetching call logs:', error);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchMessages(), fetchCallLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();

    // Subscribe to real-time updates
    const messagesChannel = supabase
      .channel('admin-messages-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    const callsChannel = supabase
      .channel('admin-calls-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_logs' }, () => {
        fetchCallLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(callsChannel);
    };
  }, []);

  const filteredConversations = conversations.filter(conv =>
    conv.participant1.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant2.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant1.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant2.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCalls = callLogs.filter(call =>
    call.caller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    call.receiver_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCallStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500">متصل</Badge>;
      case 'ended':
        return <Badge variant="secondary">منتهي</Badge>;
      case 'missed':
        return <Badge variant="destructive">فائت</Badge>;
      default:
        return <Badge variant="outline">جاري</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            مراقبة الاتصالات
          </h1>
          <p className="text-muted-foreground">مراقبة الرسائل والمكالمات بين المحامين والمشتركين</p>
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-600">وضع المراقبة الإدارية</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          هذه الصفحة مخصصة للإشراف الإداري لضمان جودة الخدمة وسلامة المستخدمين.
          جميع عمليات المراقبة مسجلة في سجل التدقيق.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{conversations.length}</p>
                <p className="text-sm text-muted-foreground">محادثة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{messages.length}</p>
                <p className="text-sm text-muted-foreground">رسالة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Video className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{callLogs.filter(c => c.call_type === 'video').length}</p>
                <p className="text-sm text-muted-foreground">مكالمة فيديو</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Phone className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{callLogs.filter(c => c.call_type === 'voice').length}</p>
                <p className="text-sm text-muted-foreground">مكالمة صوتية</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages" className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            الرسائل ({filteredConversations.length})
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            المكالمات ({filteredCalls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                المحادثات الأخيرة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredConversations.map((conv, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-2 rtl:space-x-reverse">
                          <Avatar className="w-10 h-10 border-2 border-background">
                            <AvatarFallback>{conv.participant1.name[0]}</AvatarFallback>
                          </Avatar>
                          <Avatar className="w-10 h-10 border-2 border-background">
                            <AvatarFallback>{conv.participant2.name[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="font-medium">
                            {conv.participant1.name} ↔ {conv.participant2.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {conv.messages.length} رسالة • 
                            آخر نشاط: {format(new Date(conv.lastMessageAt), 'd MMM HH:mm', { locale: ar })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedConversation(conv);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 ml-1" />
                        عرض
                      </Button>
                    </div>
                  ))}
                  {filteredConversations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد محادثات
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                سجل المكالمات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">المتصل</TableHead>
                      <TableHead className="text-right">المستقبل</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المدة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCalls.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>
                          {call.call_type === 'video' ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Video className="h-3 w-3" />
                              فيديو
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Phone className="h-3 w-3" />
                              صوتي
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {call.caller_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {call.receiver_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(call.started_at), 'd MMM yyyy HH:mm', { locale: ar })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatDuration(call.duration_seconds)}
                          </div>
                        </TableCell>
                        <TableCell>{getCallStatusBadge(call.status)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredCalls.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          لا توجد مكالمات مسجلة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Conversation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              محادثة: {selectedConversation?.participant1.name} ↔ {selectedConversation?.participant2.name}
            </DialogTitle>
            <DialogDescription>
              {selectedConversation?.messages.length} رسالة
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] p-4">
            <div className="space-y-4">
              {selectedConversation?.messages
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender_id === selectedConversation.participant1.id ? 'items-start' : 'items-end'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{msg.sender_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ar })}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-lg max-w-[80%] ${
                        msg.sender_id === selectedConversation.participant1.id
                          ? 'bg-muted'
                          : 'bg-primary/10'
                      }`}
                    >
                      <p className="text-sm">
                        {msg.content_encrypted ? '[رسالة مشفرة]' : '[محتوى غير متاح]'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunicationMonitoring;
