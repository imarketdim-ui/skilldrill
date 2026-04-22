import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';

interface Props {
  onSelect: (emoji: string) => void;
}

const ChatEmojiPicker = ({ onSelect }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" title="Эмодзи">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto border-0" align="end" sideOffset={8}>
        <EmojiPicker
          onEmojiClick={(e) => { onSelect(e.emoji); setOpen(false); }}
          emojiStyle={EmojiStyle.NATIVE}
          theme={Theme.AUTO}
          height={350}
          width={320}
          searchPlaceholder="Поиск..."
          previewConfig={{ showPreview: false }}
        />
      </PopoverContent>
    </Popover>
  );
};

export default ChatEmojiPicker;
