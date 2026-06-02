import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer
      className="mt-auto border-t border-green-800"
      style={{ background: "#166534", color: "rgba(255,255,255,0.7)", padding: "1.25rem 2%" }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        {/* Izquierda */}
        <div className="flex items-center gap-2">
          <span className="font-football text-white text-sm tracking-wider">PRODE 2026</span>
          <span>·</span>
          <span>⚽ FIFA World Cup 2026</span>
          <span>·</span>
          <span>11 jun – 19 jul</span>
        </div>

        {/* Centro */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="hover:text-white transition-colors">Inicio</Link>
          <span>·</span>
          <Link to="/fixtures" className="hover:text-white transition-colors">Partidos</Link>
          <span>·</span>
          <Link to="/leaderboard" className="hover:text-white transition-colors">Ranking</Link>
          <span>·</span>
          <Link to="/extras" className="hover:text-white transition-colors">Extras</Link>
        </div>

        {/* Derecha */}
        <div>
          © 2026 Prode 2026 · Hecho con ❤️
        </div>
      </div>
    </footer>
  );
};

export default Footer;
