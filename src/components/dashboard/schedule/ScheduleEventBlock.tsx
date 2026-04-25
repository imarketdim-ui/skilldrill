import { format } from 'date-fns';
import { ScheduleEvent, STATUS_BG } from './scheduleUtils';
import ClientHoverCard from './ClientHoverCard';

interface Props {
  event: ScheduleEvent;
  top: number;
  height: number;
  onClick?: (event: ScheduleEvent) => void;
}

export default function ScheduleEventBlock({ event, top, height, onClick }: Props) {
  const total = event.totalColumns || 1;
  const col = event.column || 0;
  const widthPct = 100 / total;
  const leftPct = widthPct * col;
  const tone = STATUS_BG[event.status] || STATUS_BG.scheduled;

  const block = (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick?.(event);
      }}
      className={`absolute rounded-md border text-left p-1.5 overflow-hidden transition-colors text-[11px] leading-tight ${tone}`}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        zIndex: 5,
      }}
    >
      <p className="font-semibold truncate">
        {format(event.start, 'HH:mm')}–{format(event.end, 'HH:mm')}
      </p>
      <p className="truncate">{event.title}</p>
      {event.subtitle && height > 44 && (
        <p className="truncate opacity-80">{event.subtitle}</p>
      )}
    </button>
  );

  if (event.clientId) {
    return (
      <ClientHoverCard clientId={event.clientId} fallbackName={event.clientName}>
        {block}
      </ClientHoverCard>
    );
  }
  return block;
}
