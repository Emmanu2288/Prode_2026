// Formatea el nombre del round para que sea más legible
const formatRound = (round) => {
  return round
    .replace("Group Stage - ", "Fase de grupos · Fecha ")
    .replace("Round of 16", "Octavos de final")
    .replace("Quarter-finals", "Cuartos de final")
    .replace("Semi-finals", "Semifinales")
    .replace("3rd Place Final", "3er y 4to puesto")
    .replace("Final", "Final");
};

const RoundFilter = ({ rounds, selected, onChange }) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide" style={{ marginTop: "1rem" }}>
      {rounds.map((round) => (
        <button
          key={round}
          onClick={() => onChange(round)}
          style={{ padding: "8px 20px", fontSize: "13px" }}
          className={`whitespace-nowrap rounded-full font-semibold transition-colors flex-shrink-0 ${
            selected === round
              ? "bg-green-600 text-white shadow-md"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {formatRound(round)}
        </button>
      ))}
    </div>
  );
};

export default RoundFilter;
