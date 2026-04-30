import { FileText, Paperclip } from 'lucide-react';

interface Props {
  message: {
    message?: string | null;
    message_type?: string | null;
    media_urls?: string[] | null;
    audio_url?: string | null;
    attachment_url?: string | null;
    attachment_type?: string | null;
  };
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogg)$/i;
const PLACEHOLDER_MESSAGES = new Set(['🎤 Голосовое', '📎 Вложение', '📷 Фото', '📎 Файл', '🎬 Видео']);

const getPathPart = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

const getFileNameFromUrl = (url: string) => {
  const path = getPathPart(url);
  return decodeURIComponent(path.split('/').pop() || 'Файл');
};

const isImageUrl = (url: string) => IMAGE_EXT_RE.test(getPathPart(url));
const isVideoUrl = (url: string) => VIDEO_EXT_RE.test(getPathPart(url));

const AttachmentPreview = ({ url, forceType }: { url: string; forceType?: 'image' | 'file' | 'video' }) => {
  const kind = forceType || (isImageUrl(url) ? 'image' : isVideoUrl(url) ? 'video' : 'file');

  if (kind === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="" className="rounded object-cover w-full h-24" />
      </a>
    );
  }

  if (kind === 'video') {
    return <video src={url} controls className="rounded max-w-full h-24 bg-black/10" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded border px-3 py-2 text-xs underline break-all bg-background/60"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span>{getFileNameFromUrl(url)}</span>
    </a>
  );
};

export const shouldRenderMessageText = (message: Props['message']) => {
  const text = message.message?.trim();
  if (!text) return false;
  return !PLACEHOLDER_MESSAGES.has(text);
};

const ChatAttachmentContent = ({ message }: Props) => {
  const mediaUrls = message.media_urls || [];
  const hasLegacyAttachment = Boolean(message.attachment_url);
  const legacyType =
    message.attachment_type === 'image'
      ? 'image'
      : message.attachment_type === 'video'
        ? 'video'
        : 'file';

  return (
    <>
      {mediaUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-1 mb-1 max-w-[240px]">
          {mediaUrls.map((url, index) => (
            <AttachmentPreview key={`${url}-${index}`} url={url} />
          ))}
        </div>
      )}

      {message.audio_url && (
        <audio src={message.audio_url} controls className="max-w-full mb-1" />
      )}

      {hasLegacyAttachment && message.attachment_url && (
        <div className="mb-1 max-w-[240px]">
          <AttachmentPreview url={message.attachment_url} forceType={legacyType} />
        </div>
      )}

      {shouldRenderMessageText(message) && (
        <p className="whitespace-pre-wrap">{message.message}</p>
      )}

      {!shouldRenderMessageText(message) && !mediaUrls.length && !message.audio_url && hasLegacyAttachment && message.attachment_type === 'file' && (
        <div className="flex items-center gap-1 text-xs text-current/80">
          <Paperclip className="h-3 w-3" />
          <span>Вложение</span>
        </div>
      )}
    </>
  );
};

export default ChatAttachmentContent;
