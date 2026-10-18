import "./nightcrawlerLights.css";

export default function NightcrawlerLights({
  ambientLightEnabled,
}: {
  ambientLightEnabled: boolean;
}) {
  return (
    <div
      className={`nightcrawler-lights${ambientLightEnabled ? "" : " nightcrawler-lights--dim"}`}
      aria-hidden="true"
    >
      <div className="nightcrawler-lights__wire" />
      <div className="nightcrawler-lights__row nightcrawler-lights__row--upper">
        {Array.from({ length: 25 }, (_, index) => (
          <span
            key={`upper-${index}`}
            className="nightcrawler-lights__drop"
            style={{ height: `${24 + (index % 3) * 5}px` }}
          >
            <i />
          </span>
        ))}
      </div>
      <div className="nightcrawler-lights__row nightcrawler-lights__row--lower">
        {Array.from({ length: 21 }, (_, index) => (
          <span
            key={`lower-${index}`}
            className="nightcrawler-lights__drop"
            style={{ height: `${39 + (index % 4) * 4}px` }}
          >
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}