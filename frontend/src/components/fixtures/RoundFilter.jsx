import { formatRound } from "../../utils/roundUtils";

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
