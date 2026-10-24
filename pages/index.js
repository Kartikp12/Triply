
import Head from "next/head";
import { useState } from "react";
import { motion } from "motion/react";

const destinations = [
  {
    name: "The tropical escape",
    place: "Bali, Indonesia",
    days: "6 days",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=85",
    tag: "MOST LOVED",
    color: "sage",
  },
  {
    name: "Into the mountains",
    place: "Swiss Alps, Switzerland",
    days: "7 days",
    image:
      "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1200&q=85",
    tag: "FOR THE SOUL",
    color: "blue",
  },
  {
    name: "A little coastal magic",
    place: "Amalfi Coast, Italy",
    days: "5 days",
    image:
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85",
    tag: "SLOW TRAVEL",
    color: "peach",
  },
];

const interests = [
  "Beaches",
  "Mountains",
  "Adventure",
  "Local food",
  "Culture",
  "Nightlife",
  "Nature",
  "Relaxation",
  "Shopping",
  "History",
  "Wildlife",
  "Photography",
];

function getLocalDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftISODate(dateString, amount) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

function Icon({ name, size = 20, strokeWidth = 1.7 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    plane: (
      <>
        <path d="m2 16 20-5-8-3-3-6-2 1 1 7-5 2-3-2-1 1 3 5Z" />
        <path d="m10 17-3 4" />
      </>
    ),
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
    right: <path d="M5 12h14m-6-6 6 6-6 6" />,
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" />
        <path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    check: <path d="m5 12 4 4L19 6" />,
    globe: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.sparkles}</svg>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Destination and travel dates
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Travellers and relationships
  const [travellers, setTravellers] = useState("2");
  const [groupType, setGroupType] = useState("Friends");
  const [groupDetails, setGroupDetails] = useState("");
  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");
  const [childrenAges, setChildrenAges] = useState("");


  // Budget
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("INR");

  const [budgetIncludesIntercity, setBudgetIncludesIntercity] =
    useState(true);

  // Preferences
  const [selectedInterests, setSelectedInterests] = useState([
    "Beaches",
    "Local food",
  ]);
  const [travelStyle, setTravelStyle] = useState("Balanced");
  const [transport, setTransport] = useState("Any suitable option");

  const [additionalRequirements, setAdditionalRequirements] = useState("");

  const [notice, setNotice] = useState("");
  const todayDate = getLocalDateISO();

  function toggleInterest(interest) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  }

  function handleDestinationSelect(place) {
    setDestination(place);
    setNotice("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    setNotice("");
  
    if (!origin.trim() || !destination.trim()) {
      setNotice("Please enter your starting city and destination.");
      return;
    }
  
    if (!departureDate || !returnDate) {
      setNotice("Please select your departure and return dates.");
      return;
    }
  
    if (departureDate < todayDate) {
      setNotice("Departure date cannot be in the past.");
      return;
    }
  
    if (returnDate <= departureDate) {
      setNotice("Return date must be after your departure date.");
      return;
    }
  
    const nights =
      (Date.parse(`${returnDate}T00:00:00.000Z`) -
        Date.parse(`${departureDate}T00:00:00.000Z`)) /
      86400000;
  
    const durationDays = nights + 1;
    const totalTravellers = Number(travellers);
    const totalBudget = Number(budget);
  
    if (
      !Number.isInteger(totalTravellers) ||
      totalTravellers < 1 ||
      totalTravellers > 50
    ) {
      setNotice("Please enter between 1 and 50 travellers.");
      return;
    }
  
    if (
      budget.trim() === "" ||
      !Number.isFinite(totalBudget) ||
      totalBudget <= 0
    ) {
      setNotice("Please enter a valid total trip budget.");
      return;
    }
  
    const hasAdults = adults.trim() !== "";
    const hasChildren = children.trim() !== "";
  
    let adultCount = null;
    let childCount = null;
  
    if (hasAdults !== hasChildren) {
      setNotice("Enter both adult and child counts, or leave both blank.");
      return;
    }
  
    if (hasAdults && hasChildren) {
      adultCount = Number(adults);
      childCount = Number(children);
  
      if (
        !Number.isInteger(adultCount) ||
        !Number.isInteger(childCount) ||
        adultCount < 0 ||
        childCount < 0 ||
        adultCount + childCount !== totalTravellers
      ) {
        setNotice(
          "Adults plus children must equal the total number of travellers."
        );
        return;
      }
    }
  
    const tripBrief = {
      origin: origin.trim(),
      destination: destination.trim(),
  
      dates: {
        departureDate,
        returnDate,
        nights,
        durationDays,
      },
  
      travellers: {
        total: totalTravellers,
        groupType,
        groupDetails: groupDetails.trim(),
        adults: adultCount,
        children: childCount,
        childrenAges: childrenAges.trim(),
      },
  
      budget: {
        amount: totalBudget,
        currency,
        scope: "total",
        totalGroupBudget: totalBudget,
        includesIntercityTransport: budgetIncludesIntercity,
      },
  
      preferences: {
        interests: selectedInterests,
        travelStyle,
        transport,
        additionalRequirements: additionalRequirements.trim(),
      },
  
      createdAt: new Date().toISOString(),
    };
  
    try {
      sessionStorage.setItem(
        "triply-trip-brief",
        JSON.stringify(tripBrief)
      );
  
      setNotice(
        `Trip brief saved: ${durationDays} days, ${totalTravellers} travellers, total budget ${currency} ${totalBudget.toLocaleString()}. Live pricing and AI planning are not connected yet.`
      );
    } catch (error) {
      console.error("Unable to save trip brief:", error);
      setNotice("Unable to save your trip details. Please try again.");
    }
  }

  return (
    <>
      <Head>
        <title>Triply — Make room for wonder</title>
        <meta
          name="description"
          content="Discover a more personal way to travel. Plan trips around your dates, people, budget and interests with Triply."
        />
        <meta name="theme-color" content="#f8f8f2" />
      </Head>

      <main>
        <header className="site-header">
          <a className="brand" href="#home" aria-label="Triply home">
            <span className="brand-mark">
              <Icon name="plane" size={20} />
            </span>
            <span>
              triply<span className="brand-period">.</span>
            </span>
          </a>

          <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
            <a href="#discover" onClick={() => setMenuOpen(false)}>
              Discover
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#start-planning" onClick={() => setMenuOpen(false)}>
              Plan a trip
            </a>
            <a
              className="mobile-nav-cta"
              href="#start-planning"
              onClick={() => setMenuOpen(false)}
            >
              Start exploring <Icon name="right" size={17} />
            </a>
          </nav>

          <a className="header-cta" href="#start-planning">
            Let&apos;s plan <Icon name="arrow" size={16} />
          </a>

          <button
            className="menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={23} />
          </button>
        </header>

        <section className="hero" id="home">
          <div className="hero-copy">
            <motion.div
              className="eyebrow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="eyebrow-dot" />
              YOUR NEXT CHAPTER STARTS HERE
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.08 }}
            >
              Less planning.
              <br />
              <span>More</span>{" "}
              <span className="serif-accent">wonder.</span>
            </motion.h1>

            <motion.p
              className="hero-description"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              The world is full of places you&apos;ll love. Tell us what moves
              you, and we&apos;ll help you find your way there.
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.3 }}
            >
              <a className="button-primary" href="#start-planning">
                Find my next adventure
                <Icon name="right" size={18} />
              </a>
              <a className="text-link" href="#discover">
                Get inspired <span>↓</span>
              </a>
            </motion.div>

            <motion.div
              className="hero-footnote"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <div className="avatar-stack" aria-hidden="true">
                <span>✳</span>
                <span>☼</span>
                <span>✦</span>
              </div>
              <p>
                Made for <strong>your kind</strong> of adventure.
                <br />
                <span>Every trip has its own story.</span>
              </p>
            </motion.div>
          </div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15 }}
          >
            <div className="hero-image">
              <div className="hero-image-shade" />

              <div className="image-top-label">
                <span className="live-dot" /> A WORLD OF POSSIBILITIES
              </div>

              <motion.div
                className="floating-note note-top"
                animate={{ y: [0, -7, 0], rotate: [-2, -1, -2] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <span className="note-icon">
                  <Icon name="heart" size={17} />
                </span>
                <span>
                  <strong>Made for you</strong>
                  <small>Not just another itinerary</small>
                </span>
              </motion.div>

              <div className="image-caption">
                <span>01 / THE ART OF GETTING AWAY</span>
                <h2>
                  Somewhere
                  <br />
                  wonderful awaits.
                </h2>
                <p>Go where you feel most alive.</p>
              </div>

              <motion.div
                className="floating-note note-bottom"
                animate={{ y: [0, 6, 0] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <span className="weather-icon">☀</span>
                <span>
                  <strong>Chase the sunshine</strong>
                  <small>Or find your own kind of calm</small>
                </span>
              </motion.div>
            </div>

            <svg
              className="flight-route"
              viewBox="0 0 220 145"
              fill="none"
              aria-hidden="true"
            >
              <path
                className="route-line"
                d="M12 126 C55 10, 135 15, 202 66"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 7"
              />
              <g className="route-plane">
                <path
                  d="M0 -7 L18 0 L0 7 L4 1 L-4 1 L-4 -1 L4 -1 Z"
                  fill="currentColor"
                />
              </g>
            </svg>

            <div className="hero-stamp" aria-label="Travel your way">
              <span>GO</span>
              <Icon name="globe" size={22} />
              <span>YOUR WAY</span>
            </div>
          </motion.div>
        </section>

        <div className="trust-strip">
          <span>YOUR BUDGET</span>
          <span className="strip-star">✳</span>
          <span>YOUR PEOPLE</span>
          <span className="strip-star">✳</span>
          <span>YOUR KIND OF MAGIC</span>
          <span className="strip-star">✳</span>
          <span>YOUR TRIP</span>
        </div>

        <section
          className="discover-section section-shell"
          id="discover"
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" /> A LITTLE INSPIRATION
              </div>
              <h2>
                Your next <span className="serif-accent">somewhere.</span>
              </h2>
              <p>
                Three little reminders of how beautiful getting away can be.
              </p>
            </div>

            <a className="text-link discover-link" href="#start-planning">
              Find my destination <Icon name="arrow" size={16} />
            </a>
          </div>

          <div className="destination-grid">
            {destinations.map((item, index) => (
              <motion.article
                className={`destination-card ${item.color}`}
                key={item.place}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: index * 0.12 }}
              >
                <a
                  href="#start-planning"
                  className="destination-image"
                  aria-label={`Plan a trip inspired by ${item.place}`}
                  onClick={() => handleDestinationSelect(item.place)}
                  style={{ backgroundImage: `url("${item.image}")` }}
                >
                  <span className="destination-tag">{item.tag}</span>
                  <span className="destination-arrow">
                    <Icon name="arrow" size={19} />
                  </span>
                </a>

                <div className="destination-meta">
                  <div>
                    <span className="destination-kicker">{item.name}</span>
                    <h3>{item.place}</h3>
                  </div>
                  <span className="destination-days">{item.days}</span>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section
          className="manifesto-section"
          id="how-it-works"
        >
          <div className="manifesto-inner">
            <div className="manifesto-symbol">
              <Icon name="sparkles" size={27} />
            </div>

            <div className="manifesto-copy">
              <div className="eyebrow light-eyebrow">
                TRAVEL, REIMAGINED
              </div>
              <h2>
                A little less{" "}
                <span className="serif-accent">overthinking.</span>
                <br />
                A lot more living.
              </h2>
              <p>
                Great trips aren&apos;t one-size-fits-all. Triply brings your
                people, your budget and your idea of a good time together —
                then helps turn it into a plan that feels like you.
              </p>
              <a className="manifesto-link" href="#start-planning">
                Let&apos;s make it yours <Icon name="right" size={18} />
              </a>
            </div>

            <div className="manifesto-steps">
              <div className="manifesto-step">
                <span>01</span>
                <div>
                  <strong>Tell us what you love</strong>
                  <small>
                    Your destination, people, dates, budget and preferences.
                  </small>
                </div>
              </div>
              <div className="manifesto-step">
                <span>02</span>
                <div>
                  <strong>Explore your possibilities</strong>
                  <small>
                    Compare thoughtfully designed ways to make the trip.
                  </small>
                </div>
              </div>
              <div className="manifesto-step">
                <span>03</span>
                <div>
                  <strong>Make it your own</strong>
                  <small>
                    Ask questions and fine-tune the plan to fit you.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="planner-section section-shell"
          id="start-planning"
        >
          <div className="planner-heading">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> YOUR ADVENTURE, YOUR RULES
            </div>
            <h2>
              So, where are we <span className="serif-accent">going?</span>
            </h2>
            <p>
              Tell us about your dates, your people and the trip you have in mind.
            </p>
          </div>


          <form className="planner-card" onSubmit={handleSubmit}>
  <div className="planner-section-label">
    <span className="eyebrow-dot" />
    YOUR DESTINATION & DATES
  </div>

  <div className="planner-fields">
    <label className="planner-field">
      <span className="field-label">
        <Icon name="pin" size={16} /> STARTING FROM
      </span>
      <input
        type="text"
        value={origin}
        onChange={(e) => setOrigin(e.target.value)}
        placeholder="e.g. Pune, Mumbai"
        maxLength={120}
        required
      />
    </label>

    <label className="planner-field">
      <span className="field-label">
        <Icon name="globe" size={16} /> DESTINATION
      </span>
      <input
        type="text"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder="e.g. Goa, Bali, Switzerland"
        maxLength={160}
        required
      />
    </label>

    <label className="planner-field">
      <span className="field-label">
        <Icon name="calendar" size={16} /> DEPARTURE DATE
      </span>
      <input
        type="date"
        min={todayDate}
        value={departureDate}
        onChange={(e) => {
          const value = e.target.value;
          setDepartureDate(value);
          if (returnDate && returnDate <= value) setReturnDate("");
          setNotice("");
        }}
        required
      />
    </label>

    <label className="planner-field">
      <span className="field-label">
        <Icon name="calendar" size={16} /> RETURN DATE
      </span>
      <input
        type="date"
        min={
          departureDate
            ? shiftISODate(departureDate, 1)
            : shiftISODate(todayDate, 1)
        }
        value={returnDate}
        onChange={(e) => {
          setReturnDate(e.target.value);
          setNotice("");
        }}
        required
      />
    </label>

    {departureDate && returnDate && returnDate > departureDate && (
      <div className="trip-duration-preview planner-field-wide">
        <Icon name="calendar" size={19} />
        <span>
          <strong>
            {(Date.parse(`${returnDate}T00:00:00Z`) -
              Date.parse(`${departureDate}T00:00:00Z`)) /
              86400000 +
              1}{" "}
            calendar days
          </strong>
          <small>
            {(Date.parse(`${returnDate}T00:00:00Z`) -
              Date.parse(`${departureDate}T00:00:00Z`)) /
              86400000}{" "}
            nights
          </small>
        </span>
      </div>
    )}
  </div>

  <div className="planner-divider" />

  <div className="planner-section-label">
    <Icon name="users" size={17} /> YOUR TRAVEL GROUP
  </div>

  <div className="planner-fields">
    <label className="planner-field">
      <span className="field-label">NUMBER OF TRAVELLERS</span>
      <input
        type="number"
        min="1"
        max="50"
        step="1"
        value={travellers}
        onChange={(e) => setTravellers(e.target.value)}
        placeholder="e.g. 4"
        required
      />
      <span className="field-helper">
        Total number of people travelling.
      </span>
    </label>

    <label className="planner-field">
      <span className="field-label">GROUP TYPE</span>
      <select
        value={groupType}
        onChange={(e) => setGroupType(e.target.value)}
      >
        <option value="Solo traveller">Solo traveller</option>
        <option value="Couple">Couple / partners</option>
        <option value="Family">Family</option>
        <option value="Friends">Friends group</option>
        <option value="Colleagues">Colleagues</option>
        <option value="Friends and family">Friends &amp; family</option>
        <option value="Mixed group">Mixed group</option>
        <option value="Other">Other</option>
      </select>
    </label>

    <label className="planner-field planner-field-wide">
      <span className="field-label">
        WHO IS TRAVELLING WITH WHOM?
        <span className="optional-label">OPTIONAL</span>
      </span>
      <input
        type="text"
        value={groupDetails}
        onChange={(e) => setGroupDetails(e.target.value)}
        placeholder="e.g. 2 parents + 2 children, 3 friends + 1 cousin"
        maxLength={250}
      />
      <span className="field-helper">
        Helps the AI tailor activities and recommendations to your group.
      </span>
    </label>
  </div>

  <div className="traveller-breakdown">
    <div className="field-label">
      ADULTS &amp; CHILDREN
      <span className="optional-label">OPTIONAL</span>
    </div>
    <p className="field-helper">
      Enter both counts if relevant. Their total must match your travellers.
    </p>

    <div className="breakdown-grid">
      <label className="planner-field">
        <span className="field-label">NUMBER OF ADULTS</span>
        <input
          type="number"
          min="0"
          max="50"
          step="1"
          value={adults}
          onChange={(e) => setAdults(e.target.value)}
          placeholder="e.g. 2"
        />
      </label>

      <label className="planner-field">
        <span className="field-label">NUMBER OF CHILDREN</span>
        <input
          type="number"
          min="0"
          max="50"
          step="1"
          value={children}
          onChange={(e) => setChildren(e.target.value)}
          placeholder="e.g. 2"
        />
      </label>

      <label className="planner-field children-ages">
        <span className="field-label">
          CHILDREN'S AGES
          <span className="optional-label">IF APPLICABLE</span>
        </span>
        <input
          type="text"
          value={childrenAges}
          onChange={(e) => setChildrenAges(e.target.value)}
          placeholder="e.g. 5 and 9 years"
          maxLength={100}
        />
      </label>
    </div>
  </div>

  <div className="planner-divider" />

  <div className="planner-section-label">
    <Icon name="sparkles" size={17} /> YOUR TOTAL TRIP BUDGET
  </div>

  <div className="planner-fields">
    <label className="planner-field planner-field-wide budget-field">
      <span className="field-label">TOTAL BUDGET FOR THE ENTIRE TRIP</span>
      <div className="budget-input-row">
        <input
          type="number"
          min="0.01"
          step="any"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="Enter your total budget"
          required
        />
        <select
          aria-label="Budget currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          <option value="INR">INR (₹)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
        </select>
      </div>
      <span className="field-helper">
        One total amount for everyone and the whole trip.
      </span>
    </label>

    <label className="planner-field">
      <span className="field-label">TRAVEL STYLE</span>
      <select
        value={travelStyle}
        onChange={(e) => setTravelStyle(e.target.value)}
      >
        <option value="Budget-friendly">Budget-friendly</option>
        <option value="Balanced">Balanced cost and comfort</option>
        <option value="Premium">Premium experiences</option>
        <option value="Luxury">Luxury</option>
      </select>
    </label>

    <label className="planner-field">
      <span className="field-label">PREFERRED TRANSPORT</span>
      <select
        value={transport}
        onChange={(e) => setTransport(e.target.value)}
      >
        <option value="Any suitable option">Suggest the best option</option>
        <option value="Flight">Flight</option>
        <option value="Train">Train</option>
        <option value="Bus">Bus</option>
        <option value="Car">Car / self-drive</option>
        <option value="Mixed transport">Combination of transport</option>
      </select>
    </label>
  </div>

  <label className="budget-inclusion">
    <input
      type="checkbox"
      checked={budgetIncludesIntercity}
      onChange={(e) => setBudgetIncludesIntercity(e.target.checked)}
    />
    <span>
      <strong>Include travel to the destination in my budget</strong>
      <small>
        Includes flights, train or intercity bus estimates in the trip budget.
      </small>
    </span>
  </label>

  <div className="planner-divider" />

  <div className="interest-area">
    <span className="field-label">
      WHAT ARE YOU INTERESTED IN?
      <span className="optional-label">OPTIONAL · SELECT MULTIPLE</span>
    </span>

    <div className="interest-chips">
      {interests.map((interest) => {
        const active = selectedInterests.includes(interest);

        return (
          <button
            className={`interest-chip ${active ? "active" : ""}`}
            type="button"
            key={interest}
            aria-pressed={active}
            onClick={() => toggleInterest(interest)}
          >
            {active && <Icon name="check" size={14} />}
            {interest}
          </button>
        );
      })}
    </div>
  </div>

  <label className="planner-field planner-field-wide additional-requirements">
    <span className="field-label">
      ANYTHING ELSE WE SHOULD KNOW?
      <span className="optional-label">OPTIONAL</span>
    </span>
    <textarea
      value={additionalRequirements}
      onChange={(e) => setAdditionalRequirements(e.target.value)}
      placeholder="Vegetarian food, less hectic schedule, must-visit places, places to avoid..."
      rows={4}
      maxLength={1500}
    />
  </label>

  <div className="planner-submit-row">
    <p>
      <Icon name="sparkles" size={17} />
      Your people. Your dates. Your kind of trip.
    </p>
    <button className="button-primary submit-button" type="submit">
      Build my trip brief <Icon name="right" size={18} />
    </button>
  </div>

  {notice && (
    <p className="planner-notice" role="status">
      <Icon name="sparkles" size={17} /> {notice}
    </p>
  )}
</form>

        </section>

        <section className="closing-section">
          <span className="closing-sun">✳</span>
          <p>THE WORLD IS WAITING</p>
          <h2>
            Go make a few <span className="serif-accent">memories.</span>
          </h2>
          <a className="button-light" href="#start-planning">
            Your story starts here <Icon name="arrow" size={17} />
          </a>
        </section>

        <footer className="site-footer">
          <a className="brand footer-brand" href="#home">
            <span className="brand-mark">
              <Icon name="plane" size={18} />
            </span>
            <span>
              triply<span className="brand-period">.</span>
            </span>
          </a>
          <p>Thoughtful trips. Unforgettable stories.</p>
          <a href="#home" className="back-top">
            BACK TO TOP ↑
          </a>
          <span className="footer-copy">© {new Date().getFullYear()} Triply</span>
        </footer>
      </main>
    </>
  );
}
