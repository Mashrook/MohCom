import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Play,
  RefreshCw,
  Database,
  Lock
} from "lucide-react";
import { useRLSPolicyTests, RLSTestSuite } from "@/hooks/useRLSPolicyTests";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const RLSPolicyTestsPanel: React.FC = () => {
  const { testResults, running, progress, runAllTests, getOverallStats } = useRLSPolicyTests();
  const stats = getOverallStats();

  const getStatusColor = (passed: boolean) => {
    return passed ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Header and Run Button */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              اختبارات سياسات RLS
            </CardTitle>
            <Button 
              onClick={runAllTests} 
              disabled={running}
              className="gap-2"
            >
              {running ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  جاري الاختبار...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  تشغيل الاختبارات
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {running && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>التقدم</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          
          {!running && stats.totalTests > 0 && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.totalTests}</p>
                <p className="text-xs text-muted-foreground">إجمالي الاختبارات</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{stats.passedTests}</p>
                <p className="text-xs text-muted-foreground">ناجح</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{stats.failedTests}</p>
                <p className="text-xs text-muted-foreground">فاشل</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${getPassRateColor(stats.passRate)}`}>
                  {stats.passRate}%
                </p>
                <p className="text-xs text-muted-foreground">نسبة النجاح</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results by Table */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">نتائج الاختبارات</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Accordion type="multiple" className="space-y-2">
                {testResults.map((suite) => (
                  <AccordionItem 
                    key={suite.tableName} 
                    value={suite.tableName}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full ml-4">
                        <div className="flex items-center gap-3">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{suite.tableName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={suite.failedTests === 0 ? "default" : "destructive"}
                            className="gap-1"
                          >
                            {suite.failedTests === 0 ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {suite.passedTests}/{suite.totalTests}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {suite.results.map((result) => (
                          <div 
                            key={result.id}
                            className={`p-3 rounded-lg border ${
                              result.passed 
                                ? 'bg-green-500/5 border-green-500/20' 
                                : 'bg-red-500/5 border-red-500/20'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {getStatusIcon(result.passed)}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className={`text-sm font-medium ${getStatusColor(result.passed)}`}>
                                    {result.testName}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {result.passed ? 'ناجح' : 'فاشل'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {result.description}
                                </p>
                                {result.errorMessage && (
                                  <p className="text-xs text-red-500 mt-2 font-mono bg-red-500/10 p-2 rounded">
                                    {result.errorMessage}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(result.executedAt).toLocaleString('ar-SA')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {testResults.length === 0 && !running && (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">اختبارات سياسات الأمان</h3>
            <p className="text-muted-foreground text-sm mb-4">
              قم بتشغيل الاختبارات للتحقق من صحة سياسات RLS على جميع الجداول
            </p>
            <Button onClick={runAllTests} className="gap-2">
              <Play className="h-4 w-4" />
              بدء الاختبارات
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RLSPolicyTestsPanel;
