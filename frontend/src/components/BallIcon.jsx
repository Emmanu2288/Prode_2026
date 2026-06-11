const BallIcon = ({ className = "" }) => (
  <span className={`relative inline-block rounded-full overflow-hidden align-middle ${className}`}>
    <img
      src="/world-cup-ball.png"
      alt=""
      className="absolute -left-[25%] -top-[14%] w-[150%] h-[150%] max-w-none object-cover"
    />
  </span>
);

export default BallIcon;
