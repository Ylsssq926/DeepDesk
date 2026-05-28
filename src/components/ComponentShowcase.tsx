/**
 * ComponentShowcase — 开发期组件预览页
 *
 * 未挂载到生产路由，仅供开发期间预览 12 个核心 UI 组件。
 * 可通过临时修改 App.tsx 引入此组件来查看效果。
 *
 * 使用方式：
 *   import { ComponentShowcase } from '@/components/ComponentShowcase';
 *   // 临时替换 App 主内容区域
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  MessageSquare,
  Settings,
  Search,
  Plus,
  Trash2,
  Copy,
  Moon,
  Sun,
  ChevronDown,
  Zap,
} from 'lucide-react';

import {
  Button,
  Input,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ScrollArea,
  Switch,
  Toaster,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui';

/**
 * 组件预览页。
 *
 * 展示所有 12 个核心 UI 组件的各种状态。
 * 支持亮/暗模式切换预览。
 *
 * @example
 * ```tsx
 * // 临时在 App.tsx 中使用
 * import { ComponentShowcase } from '@/components/ComponentShowcase';
 * <ComponentShowcase />
 * ```
 */
export function ComponentShowcase() {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [switchChecked, setSwitchChecked] = useState(true);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-bg-base text-fg-primary p-8">
        {/* 页头 */}
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-[620] brand-gradient-text">
                DeepDesk UI Components
              </h1>
              <p className="text-sm text-fg-secondary mt-1">
                12 个核心组件预览 · shadcn/ui new-york style · DeepDesk tokens
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="切换主题">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </div>

          {/* 1. Button */}
          <Section title="1. Button" description="6 种变体 × 3 种尺寸">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="primary" size="icon" aria-label="添加">
                <Plus size={16} />
              </Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </Section>

          {/* 2. Input */}
          <Section title="2. Input" description="单行文本输入">
            <div className="flex flex-col gap-3 max-w-sm">
              <Input placeholder="默认输入框..." />
              <Input placeholder="禁用状态" disabled />
              <Input type="password" placeholder="密码输入..." />
            </div>
          </Section>

          {/* 3. Textarea */}
          <Section title="3. Textarea" description="多行文本输入，支持自适应高度">
            <div className="max-w-sm">
              <Textarea placeholder="输入多行内容..." rows={3} />
            </div>
          </Section>

          {/* 4. Dialog */}
          <Section title="4. Dialog" description="模态对话框">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">打开 Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>确认操作</DialogTitle>
                  <DialogDescription>
                    此操作将清除所有对话历史，是否继续？
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">取消</Button>
                  <Button variant="danger">确认删除</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>

          {/* 5. DropdownMenu */}
          <Section title="5. DropdownMenu" description="下拉菜单">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  操作菜单 <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>对话操作</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Copy size={14} /> 复制
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare size={14} /> 新建对话
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="danger">
                  <Trash2 size={14} /> 删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Section>

          {/* 6. Tooltip */}
          <Section title="6. Tooltip" description="悬停提示（延迟 350ms）">
            <div className="flex gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="设置">
                    <Settings size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>设置</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="搜索">
                    <Search size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>搜索 (⌘K)</TooltipContent>
              </Tooltip>
            </div>
          </Section>

          {/* 7. Sheet */}
          <Section title="7. Sheet" description="侧滑抽屉">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">打开 Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>设置面板</SheetTitle>
                  <SheetDescription>调整应用偏好设置</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">暗色模式</span>
                    <Switch checked={isDark} onCheckedChange={toggleTheme} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">通知提醒</span>
                    <Switch checked={switchChecked} onCheckedChange={setSwitchChecked} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </Section>

          {/* 8. Tabs */}
          <Section title="8. Tabs" description="标签页切换">
            <Tabs defaultValue="general" className="max-w-md">
              <TabsList>
                <TabsTrigger value="general">通用</TabsTrigger>
                <TabsTrigger value="appearance">外观</TabsTrigger>
                <TabsTrigger value="shortcuts">快捷键</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <p className="text-sm text-fg-secondary p-3">通用设置内容区域</p>
              </TabsContent>
              <TabsContent value="appearance">
                <p className="text-sm text-fg-secondary p-3">外观设置内容区域</p>
              </TabsContent>
              <TabsContent value="shortcuts">
                <p className="text-sm text-fg-secondary p-3">快捷键设置内容区域</p>
              </TabsContent>
            </Tabs>
          </Section>

          {/* 9. ScrollArea */}
          <Section title="9. ScrollArea" description="自定义滚动区域">
            <ScrollArea className="h-[150px] w-[300px] rounded-lg border border-border p-3">
              <div className="space-y-2">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="text-sm text-fg-secondary">
                    对话记录 #{i + 1} — 这是一条示例消息
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Section>

          {/* 10. Switch */}
          <Section title="10. Switch" description="开关切换">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="switch-demo"
                  checked={switchChecked}
                  onCheckedChange={setSwitchChecked}
                />
                <label htmlFor="switch-demo" className="text-sm">
                  {switchChecked ? '已启用' : '已禁用'}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch disabled />
                <span className="text-sm text-fg-disabled">禁用态</span>
              </div>
            </div>
          </Section>

          {/* 11. Sonner (Toast) */}
          <Section title="11. Sonner (Toast)" description="通知提示">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => toast('消息已发送')}
              >
                默认 Toast
              </Button>
              <Button
                variant="secondary"
                onClick={() => toast.success('设置已保存')}
              >
                成功
              </Button>
              <Button
                variant="secondary"
                onClick={() => toast.error('操作失败', { description: '请检查网络连接' })}
              >
                错误
              </Button>
              <Button
                variant="secondary"
                onClick={() => toast.warning('存储空间不足')}
              >
                警告
              </Button>
            </div>
          </Section>

          {/* 12. Command */}
          <Section title="12. Command" description="命令面板（Raycast 风格）">
            <div className="max-w-md border border-border rounded-lg overflow-hidden">
              <Command>
                <CommandInput placeholder="搜索命令..." />
                <CommandList>
                  <CommandEmpty>未找到结果</CommandEmpty>
                  <CommandGroup heading="快速操作">
                    <CommandItem>
                      <Plus size={14} />
                      <span>新建对话</span>
                      <CommandShortcut>⌘N</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Search size={14} />
                      <span>搜索历史</span>
                      <CommandShortcut>⌘F</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Settings size={14} />
                      <span>打开设置</span>
                      <CommandShortcut>⌘,</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="模型">
                    <CommandItem>
                      <Zap size={14} />
                      <span>DeepSeek V3</span>
                    </CommandItem>
                    <CommandItem>
                      <Zap size={14} />
                      <span>DeepSeek R1</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </Section>
        </div>

        {/* Toaster 容器 */}
        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}

/** 展示区块 */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-md font-[620] text-fg-primary">{title}</h2>
        <p className="text-xs text-fg-tertiary">{description}</p>
      </div>
      <div className="p-4 rounded-lg border border-border bg-bg-elevated">
        {children}
      </div>
    </section>
  );
}
