import { ExternalLink, Phone, Search, ShieldAlert, Sprout } from "lucide-react";
import type {
  RaituNesthamPriority,
  RaituNesthamResearchRecord,
} from "./raitunestham-research.server";

const PRIVATE_NOTICE =
  "Private research · channel-reported and unverified · not a FarmerBook member or outreach consent.";

function humanizePriority(priority: RaituNesthamPriority) {
  if (priority === "method") return "Method reference";
  if (priority === "allied") return "Allied enterprise";
  return "Recent priority";
}

function formatIndianPhone(phone: string) {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export function RaituNesthamResearchView({
  records,
  summary,
  filters,
}: {
  records: readonly RaituNesthamResearchRecord[];
  summary: {
    total: number;
    withPublicPhone: number;
    recent: number;
    method: number;
    allied: number;
  };
  filters: { q: string; priority: "" | RaituNesthamPriority };
}) {
  return (
    <div className="raitunestham-research">
      <section className="card sourced-farmer-boundary" role="note">
        <ShieldAlert aria-hidden="true" />
        <div>
          <strong>{PRIVATE_NOTICE}</strong>
          <p>
            Names, locations, farming methods, results and phone ownership come
            from public Raitu Nestham video metadata. Re-check the source and
            obtain purpose-specific opt-in before retaining or using a number
            for outreach.
          </p>
        </div>
      </section>

      <section
        className="farmer-database-summary sourced-farmer-summary"
        aria-label="Raitu Nestham research summary"
      >
        {[
          ["Profiles", summary.total],
          ["Public phones", summary.withPublicPhone],
          ["Recent priorities", summary.recent],
          ["Method references", summary.method],
        ].map(([label, value]) => (
          <article className="card" key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <form className="card raitunestham-research__filters" method="get">
        <label className="field">
          <span>Search name, location, crop, method or phone</span>
          <input
            name="q"
            defaultValue={filters.q}
            maxLength={120}
            placeholder="Example: paddy, Telangana or farmer name"
          />
        </label>
        <label className="field">
          <span>Research group</span>
          <select name="priority" defaultValue={filters.priority}>
            <option value="">All groups</option>
            <option value="recent">Recent priorities</option>
            <option value="method">Method references</option>
            <option value="allied">Allied enterprises</option>
          </select>
        </label>
        <button className="button button--secondary" type="submit">
          <Search size={16} aria-hidden="true" /> Apply filters
        </button>
      </form>

      <section aria-labelledby="raitunestham-results-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Read-only founder research</p>
            <h2 id="raitunestham-results-heading">
              <Sprout size={22} aria-hidden="true" /> {records.length} matching
              {records.length === 1 ? " profile" : " profiles"}
            </h2>
          </div>
        </div>

        {records.length ? (
          <div className="raitunestham-research__grid">
            {records.map((record) => (
              <article className="card raitunestham-research__profile" key={record.id}>
                <div className="tag-row">
                  <span className="tag">{humanizePriority(record.priority)}</span>
                  <span className="tag">Video {record.videoDate}</span>
                </div>
                <h3 dir="auto">{record.farmerOrGroup}</h3>
                <p className="raitunestham-research__location" dir="auto">
                  {[record.location, record.state].filter(Boolean).join(", ")}
                </p>
                <dl className="raitunestham-research__details">
                  <div>
                    <dt>Focus</dt>
                    <dd dir="auto">{record.farmingFocus}</dd>
                  </div>
                  <div>
                    <dt>Scale</dt>
                    <dd dir="auto">{record.scale ?? "Not stated"}</dd>
                  </div>
                  <div>
                    <dt>Methods and crops</dt>
                    <dd dir="auto">{record.methodsOrCrops}</dd>
                  </div>
                  {record.channelReportedClaim ? (
                    <div>
                      <dt>Channel-reported claim</dt>
                      <dd dir="auto">{record.channelReportedClaim}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="raitunestham-research__actions">
                  {record.publicUnverifiedPhone ? (
                    <div className="raitunestham-research__phone">
                      <a href={`tel:+91${record.publicUnverifiedPhone}`}>
                        <Phone size={15} aria-hidden="true" />
                        {formatIndianPhone(record.publicUnverifiedPhone)}
                      </a>
                      <small>Public/unverified · not outreach consent</small>
                    </div>
                  ) : (
                    <p className="muted">No public Farmer phone stated.</p>
                  )}
                  <a href={record.youtubeSource} target="_blank" rel="noreferrer">
                    Open source video <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <p>No reviewed profiles match these filters.</p>
          </div>
        )}
      </section>
    </div>
  );
}
