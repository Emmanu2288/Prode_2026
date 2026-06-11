import { Link } from "react-router-dom";
import BallIcon from "../components/BallIcon";

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
    <BallIcon className="w-16 h-16 mb-4" />
    <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
    <p className="text-gray-500 mb-6">Esta página no existe</p>
    <Link
      to="/dashboard"
      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
    >
      Volver al inicio
    </Link>
  </div>
);

export default NotFound;
