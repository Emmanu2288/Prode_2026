const STATUS_CONFIG = {
  NS:  { label: "Por jugar",  className: "bg-gray-100 text-gray-600" },
  FT:  { label: "Finalizado", className: "bg-green-100 text-green-700" },
  AET: { label: "Finalizado (prórroga)", className: "bg-green-100 text-green-700" },
  PEN: { label: "Finalizado (penales)", className: "bg-green-100 text-green-700" },
  "1H": { label: "1er tiempo", className: "bg-red-100 text-red-600 animate-pulse" },
  "2H": { label: "2do tiempo", className: "bg-red-100 text-red-600 animate-pulse" },
  HT:  { label: "Descanso",   className: "bg-yellow-100 text-yellow-700" },
  ET:  { label: "Prórroga",   className: "bg-orange-100 text-orange-700 animate-pulse" },
  P:   { label: "Penales",    className: "bg-orange-100 text-orange-700 animate-pulse" },
  PST: { label: "Postergado", className: "bg-gray-100 text-gray-500" },
  CANC:{ label: "Cancelado",  className: "bg-red-100 text-red-500" },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
