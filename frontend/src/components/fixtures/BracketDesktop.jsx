import { getSlotLabel } from "../../utils/bracketUtils";

const X = {
  r32L: 10, r16L: 220, qfL: 380, sfL: 530, final: 670,
  sfR: 835, qfR: 975, r16R: 1125, r32R: 1285,
};
const W = { r32: 165, r16: 115, qf: 105, sf: 95, final: 120 };
const Y32 = [40, 102, 164, 226, 288, 350, 412, 474];
const Y16 = [71, 195, 319, 443];
const YQF = [133, 381];
const YSF = 257;

const connector = (xChild, yA, yB, xMid, yParent, xParent) => (
  <>
    <path d={`M${xChild},${yA} H${xMid} V${yParent} H${xParent}`} stroke="var(--border)" strokeWidth="1.5" fill="none" />
    <path d={`M${xChild},${yB} H${xMid} V${yParent} H${xParent}`} stroke="var(--border)" strokeWidth="1.5" fill="none" />
  </>
);

const MatchBox = ({ x, y, w, side, labelA, labelB, winnerName, score, empty }) => {
  const h = 46;
  const anchor = side === "right" ? "end" : "start";
  const tx = side === "right" ? x + w - 8 : x + 8;
  if (empty) {
    return (
      <g>
        <rect x={x} y={y - 23} width={w} height={h} rx="6" fill="var(--bg-main)" stroke="var(--border)" />
        <text x={x + w / 2} y={y + 4} textAnchor="middle" fontSize="13" fill="var(--text-muted)">?</text>
      </g>
    );
  }
  return (
    <g fontSize="12.5">
      <rect x={x} y={y - 23} width={w} height={h} rx="6" fill="var(--bg-card)" stroke="var(--border)" />
      <line x1={x} y1={y} x2={x + w} y2={y} stroke="var(--border)" />
      <text x={tx} y={y - 7} textAnchor={anchor} fill={winnerName && winnerName !== labelA ? "var(--text-muted)" : "var(--text-primary)"} fontWeight={winnerName === labelA ? "500" : "400"}>
        {labelA}
      </text>
      <text x={tx} y={y + 16} textAnchor={anchor} fill={winnerName && winnerName !== labelB ? "var(--text-muted)" : "var(--text-primary)"} fontWeight={winnerName === labelB ? "500" : "400"}>
        {labelB}
      </text>
      {score && (
        <>
          <text x={side === "right" ? x + 8 : x + w - 8} y={y - 7} textAnchor={side === "right" ? "start" : "end"} fill={winnerName === labelA ? "var(--text-primary)" : "var(--text-muted)"} fontWeight={winnerName === labelA ? "500" : "400"}>{score[0]}</text>
          <text x={side === "right" ? x + 8 : x + w - 8} y={y + 16} textAnchor={side === "right" ? "start" : "end"} fill={winnerName === labelB ? "var(--text-primary)" : "var(--text-muted)"} fontWeight={winnerName === labelB ? "500" : "400"}>{score[1]}</text>
        </>
      )}
    </g>
  );
};

const renderSide = (rounds, side) => {
  const isLeft = side === "left";
  const r32 = isLeft ? rounds["Round of 32"].slice(0, 8) : rounds["Round of 32"].slice(8, 16);
  const r16 = isLeft ? rounds["Round of 16"].slice(0, 4) : rounds["Round of 16"].slice(4, 8);
  const qf = isLeft ? rounds["Quarter-finals"].slice(0, 2) : rounds["Quarter-finals"].slice(2, 4);
  const sf = isLeft ? rounds["Semi-finals"][0] : rounds["Semi-finals"][1];

  const xR32 = isLeft ? X.r32L : X.r32R;
  const xR16 = isLeft ? X.r16L : X.r16R;
  const xQf = isLeft ? X.qfL : X.qfR;
  const xSf = isLeft ? X.sfL : X.sfR;

  return (
    <g>
      {r32.map((m, i) => (
        <MatchBox key={`r32-${side}-${i}`} x={xR32} y={Y32[i]} w={W.r32} side={side}
          labelA={m.teamA.name} labelB={m.teamB.name} winnerName={m.winner}
          score={m.fixture && ["FT", "AET", "PEN"].includes(m.fixture.fixture.status.short) ? [m.fixture.goals.home, m.fixture.goals.away] : null} />
      ))}
      {r16.map((m, i) => {
        const labelA = getSlotLabel(m.teamA, m.leftSource);
        const labelB = getSlotLabel(m.teamB, m.rightSource);
        return labelA && labelB ? (
          <MatchBox key={`r16-${side}-${i}`} x={xR16} y={Y16[i]} w={W.r16} side={side}
            labelA={labelA} labelB={labelB} winnerName={m.winner}
            score={m.fixture && ["FT", "AET", "PEN"].includes(m.fixture.fixture.status.short) ? [m.fixture.goals.home, m.fixture.goals.away] : null} />
        ) : (
          <MatchBox key={`r16-${side}-${i}`} x={xR16} y={Y16[i]} w={W.r16} side={side} empty />
        );
      })}
      {qf.map((m, i) => {
        const labelA = getSlotLabel(m.teamA, m.leftSource);
        const labelB = getSlotLabel(m.teamB, m.rightSource);
        return labelA && labelB ? (
          <MatchBox key={`qf-${side}-${i}`} x={xQf} y={YQF[i]} w={W.qf} side={side}
            labelA={labelA} labelB={labelB} winnerName={m.winner}
            score={m.fixture && ["FT", "AET", "PEN"].includes(m.fixture.fixture.status.short) ? [m.fixture.goals.home, m.fixture.goals.away] : null} />
        ) : (
          <MatchBox key={`qf-${side}-${i}`} x={xQf} y={YQF[i]} w={W.qf} side={side} empty />
        );
      })}
      {(() => {
        const labelA = getSlotLabel(sf.teamA, sf.leftSource);
        const labelB = getSlotLabel(sf.teamB, sf.rightSource);
        return labelA && labelB ? (
          <MatchBox x={xSf} y={YSF} w={W.sf} side={side}
            labelA={labelA} labelB={labelB} winnerName={sf.winner}
            score={sf.fixture && ["FT", "AET", "PEN"].includes(sf.fixture.fixture.status.short) ? [sf.fixture.goals.home, sf.fixture.goals.away] : null} />
        ) : (
          <MatchBox x={xSf} y={YSF} w={W.sf} side={side} empty />
        );
      })()}

      {(() => {
        const r32Edge = isLeft ? xR32 + W.r32 : xR32;
        const r16LeftEdge = isLeft ? xR16 : xR16 + W.r16;
        const r16Edge = isLeft ? xR16 + W.r16 : xR16;
        const qfLeftEdge = isLeft ? xQf : xQf + W.qf;
        const qfEdge = isLeft ? xQf + W.qf : xQf;
        const sfLeftEdge = isLeft ? xSf : xSf + W.sf;
        const mid32 = isLeft ? r32Edge + 23 : r32Edge - 23;
        const mid16 = isLeft ? r16Edge + 23 : r16Edge - 23;
        const midQf = isLeft ? qfEdge + 23 : qfEdge - 23;
        return (
          <>
            {connector(r32Edge, Y32[0], Y32[1], mid32, Y16[0], r16LeftEdge)}
            {connector(r32Edge, Y32[2], Y32[3], mid32, Y16[1], r16LeftEdge)}
            {connector(r32Edge, Y32[4], Y32[5], mid32, Y16[2], r16LeftEdge)}
            {connector(r32Edge, Y32[6], Y32[7], mid32, Y16[3], r16LeftEdge)}
            {connector(r16Edge, Y16[0], Y16[1], mid16, YQF[0], qfLeftEdge)}
            {connector(r16Edge, Y16[2], Y16[3], mid16, YQF[1], qfLeftEdge)}
            {connector(qfEdge, YQF[0], YQF[1], midQf, YSF, sfLeftEdge)}
            <path d={isLeft ? `M${xSf + W.sf},${YSF} H${X.final}` : `M${xSf},${YSF} H${X.final + W.final}`} stroke="var(--border)" strokeWidth="1.5" fill="none" />
          </>
        );
      })()}
    </g>
  );
};

const BracketDesktop = ({ rounds }) => {
  const finalM = rounds["Final"][0];
  const finalLabelA = getSlotLabel(finalM.teamA, finalM.leftSource);
  const finalLabelB = getSlotLabel(finalM.teamB, finalM.rightSource);

  return (
    <svg width="100%" viewBox="0 0 1460 520" role="img">
      <title>Cuadro de eliminación directa, Mundial 2026</title>
      <text x="92" y="10" textAnchor="middle" fontSize="12" fill="var(--text-muted)">16vos</text>
      <text x="277" y="10" textAnchor="middle" fontSize="12" fill="var(--text-muted)">8vos</text>
      <text x="432" y="10" textAnchor="middle" fontSize="12" fill="var(--text-muted)">4tos</text>
      <text x="577" y="10" textAnchor="middle" fontSize="12" fill="var(--text-muted)">Semis</text>
      <text x="730" y="10" textAnchor="middle" fontSize="12" fill="var(--text-secondary)" fontWeight="500">Final</text>
      <text x="882" y="10" textAnchor="middle" fontSize="12" fill="var(--text-muted)">Semis</text>
      <text x="1027" y="10" textAnchor="middle" fontSize="12" fill="var(--text-muted)">4tos</text>
      <text x="1182" y="10" textAnchor="middle" fontSize="12" fill="var(--text-muted)">8vos</text>
      <text x="1367" y="10" textAnchor="middle" fontSize="12" fill="var(--text-muted)">16vos</text>

      {renderSide(rounds, "left")}
      {renderSide(rounds, "right")}

      {finalLabelA && finalLabelB ? (
        <MatchBox x={X.final} y={YSF} w={W.final} side="left" labelA={finalLabelA} labelB={finalLabelB} winnerName={finalM.winner} />
      ) : (
        <MatchBox x={X.final} y={YSF} w={W.final} side="left" empty />
      )}
    </svg>
  );
};

export default BracketDesktop;
