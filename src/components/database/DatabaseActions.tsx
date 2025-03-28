
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileText, Save, Trash2, Download } from 'lucide-react';
import { backgroundGenerator } from '@/lib/services/backgroundGeneratorService';

interface DatabaseActionsProps {
  isLoading: boolean;
  isExporting: boolean;
  totalStored: number;
  onManualSave: () => void;
  onClearDatabase: () => void;
  onExport: (format: 'csv' | 'txt') => void;
}

const DatabaseActions: React.FC<DatabaseActionsProps> = ({
  isLoading,
  isExporting,
  totalStored,
  onManualSave,
  onClearDatabase,
  onExport
}) => {
  const backgroundState = backgroundGenerator.getState();
  const isBackgroundGenerating = backgroundState.isRunning;
  
  return (
    <div className="space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            导出数据
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => onExport('csv')}
            disabled={isExporting || totalStored === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            导出为CSV
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onExport('txt')}
            disabled={isExporting || totalStored === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            导出为TXT
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" onClick={onManualSave} disabled={isLoading}>
        <Save className="mr-2 h-4 w-4" />
        手动保存
      </Button>
      {isBackgroundGenerating && (
        <Button 
          variant="outline" 
          onClick={() => backgroundGenerator.stopGeneration()} 
          className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
        >
          <Download className="mr-2 h-4 w-4" />
          导入后台数据
        </Button>
      )}
      <Button variant="destructive" onClick={onClearDatabase} disabled={isLoading}>
        <Trash2 className="mr-2 h-4 w-4" />
        清空数据库
      </Button>
    </div>
  );
};

export default DatabaseActions;
