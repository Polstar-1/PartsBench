export default function Icon({ name, size = 22 }) {
  const c = { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  switch (name) {
    case "brake": return (<svg {...c}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.2" /><line x1="12" y1="4" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="20" /><line x1="4" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="20" y2="12" /></svg>);
    case "filter": return (<svg {...c}><rect x="7" y="3" width="10" height="18" rx="2.5" /><line x1="9.5" y1="6" x2="9.5" y2="18" /><line x1="12" y1="6" x2="12" y2="18" /><line x1="14.5" y1="6" x2="14.5" y2="18" /></svg>);
    case "battery": return (<svg {...c}><rect x="3" y="8" width="18" height="10" rx="1.5" /><line x1="8" y1="5.5" x2="8" y2="8" /><line x1="16" y1="5.5" x2="16" y2="8" /><line x1="7" y1="13" x2="10" y2="13" /><line x1="14" y1="13" x2="17" y2="13" /><line x1="8.5" y1="11.5" x2="8.5" y2="14.5" /></svg>);
    case "spark": return (<svg {...c}><path d="M9 3h6l-1 5h2l-7 12 1-8H8l1-9z" /></svg>);
    case "belt": return (<svg {...c}><circle cx="7" cy="12" r="4" /><circle cx="17" cy="12" r="4" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="16" x2="17" y2="16" /></svg>);
    case "strut": return (<svg {...c}><path d="M12 2v3" /><path d="M9 5c0 1 3 .5 3 1.5S9 7.5 9 8.5s3 .5 3 1.5-3 .5-3 1.5 3 .5 3 1.5-3 .5-3 1.5" /><path d="M12 19v3" /></svg>);
    case "light": return (<svg {...c}><path d="M4 12c0-4 3-7 7-7s7 3 7 7-3 4-7 4-7 0-7-4z" /><line x1="18" y1="9" x2="21" y2="8" /><line x1="18" y1="12" x2="21.5" y2="12" /><line x1="18" y1="15" x2="21" y2="16" /></svg>);
    case "radiator": return (<svg {...c}><rect x="4" y="5" width="16" height="14" rx="1" /><line x1="7.5" y1="5" x2="7.5" y2="19" /><line x1="11" y1="5" x2="11" y2="19" /><line x1="14.5" y1="5" x2="14.5" y2="19" /><line x1="18" y1="5" x2="18" y2="19" /></svg>);
    case "wiper": return (<svg {...c}><circle cx="5" cy="19" r="1.6" /><path d="M6 18L18 5" /><path d="M18 5l3 1-1 3" /></svg>);
    case "exhaust": return (<svg {...c}><line x1="3" y1="15" x2="12" y2="15" /><rect x="12" y="11" width="7" height="8" rx="2" /><line x1="19" y1="13.5" x2="22" y2="13" /><line x1="19" y1="16.5" x2="22" y2="17" /></svg>);
    case "mirror": return (<svg {...c}><path d="M6 9c0-2 2-4 5-4s5 2 5 4-2 5-5 5-5-3-5-5z" /><line x1="9" y1="14" x2="7" y2="19" /></svg>);
    case "engine": return (<svg {...c}><rect x="4" y="9" width="12" height="8" rx="1" /><rect x="16" y="11" width="4" height="4" /><line x1="7" y1="9" x2="7" y2="6" /><line x1="10" y1="9" x2="10" y2="6" /><line x1="13" y1="9" x2="13" y2="6" /></svg>);
    case "fuel": return (<svg {...c}><rect x="5" y="4" width="9" height="16" rx="1.5" /><rect x="7.5" y="6.5" width="4" height="3.5" /><path d="M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 3 0V8l-2.5-2.5" /></svg>);
    case "gear": return (<svg {...c}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="6.5" /></svg>);
    case "tire": return (<svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5.5" /><circle cx="12" cy="12" r="1.5" /><line x1="12" y1="6.5" x2="12" y2="10.5" /><line x1="12" y1="13.5" x2="12" y2="17.5" /><line x1="6.5" y1="12" x2="10.5" y2="12" /><line x1="13.5" y1="12" x2="17.5" y2="12" /></svg>);
    case "snow": return (<svg {...c}><line x1="12" y1="3" x2="12" y2="21" /><line x1="4.2" y1="7.5" x2="19.8" y2="16.5" /><line x1="4.2" y1="16.5" x2="19.8" y2="7.5" /><path d="M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" /></svg>);
    case "tool": return (<svg {...c}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></svg>);
    case "seat": return (<svg {...c}><path d="M8 3h5a2 2 0 0 1 2 2v7H8z" /><path d="M8 12v3h9a2 2 0 0 1 2 2v3" /><line x1="8" y1="20" x2="8" y2="15" /></svg>);
    case "door": return (<svg {...c}><path d="M5 20V9l4-5h9a1 1 0 0 1 1 1v15z" /><line x1="9" y1="4" x2="9" y2="10" /><line x1="9" y1="10" x2="19" y2="10" /><line x1="15" y1="14" x2="17" y2="14" /></svg>);
    case "sensor": return (<svg {...c}><circle cx="12" cy="12" r="3" /><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4.5 4.5a11 11 0 0 0 0 15M19.5 4.5a11 11 0 0 1 0 15" /></svg>);
    case "plug": return (<svg {...c}><path d="M9 3v5M15 3v5" /><path d="M6 8h12v3a6 6 0 0 1-12 0z" /><path d="M12 17v4" /></svg>);
    case "steering": return (<svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" /><path d="M3.2 10.5C7 11 9 11.2 10 12M20.8 10.5C17 11 15 11.2 14 12M12 14v7" /></svg>);
    case "fan": return (<svg {...c}><circle cx="12" cy="12" r="1.5" /><path d="M12 10.5C12 6 14 4 16 4c1.5 0 2 1.5 1 3s-3 3.5-5 3.5zM13.5 12c4.5 0 6.5 2 6.5 4 0 1.5-1.5 2-3 1s-3.5-3-3.5-5zM12 13.5C12 18 10 20 8 20c-1.5 0-2-1.5-1-3s3-3.5 5-3.5zM10.5 12C6 12 4 10 4 8c0-1.5 1.5-2 3-1s3.5 3 3.5 5z" /></svg>);
    case "drop": return (<svg {...c}><path d="M12 3c3.5 4.5 6 7.5 6 10.5a6 6 0 0 1-12 0C6 10.5 8.5 7.5 12 3z" /></svg>);
    case "search": return (<svg {...c}><circle cx="11" cy="11" r="6.5" /><line x1="16" y1="16" x2="21" y2="21" /></svg>);
    case "garage": return (<svg {...c}><path d="M3 10l9-6 9 6v10H3z" /><rect x="7" y="12" width="10" height="8" /><line x1="7" y1="15" x2="17" y2="15" /><line x1="7" y1="17.5" x2="17" y2="17.5" /></svg>);
    case "wrench": return (<svg {...c}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></svg>);
    case "tag": return (<svg {...c}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></svg>);
    case "bulb": return (<svg {...c}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2.2h5c.1-1 .5-1.7 1.1-2.2A6 6 0 0 0 12 3z" /></svg>);
    case "chat": return (<svg {...c}><path d="M4 5h16v11H9l-5 4z" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="12" x2="13" y2="12" /></svg>);
    case "check": return (<svg {...c}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
    case "cog": return (<svg {...c}><circle cx="12" cy="12" r="7.2" /><circle cx="12" cy="12" r="2.8" /><g strokeWidth="2.6"><line x1="19.2" y1="12" x2="21.6" y2="12" /><line x1="17.09" y1="17.09" x2="18.79" y2="18.79" /><line x1="12" y1="19.2" x2="12" y2="21.6" /><line x1="6.91" y1="17.09" x2="5.21" y2="18.79" /><line x1="4.8" y1="12" x2="2.4" y2="12" /><line x1="6.91" y1="6.91" x2="5.21" y2="5.21" /><line x1="12" y1="4.8" x2="12" y2="2.4" /><line x1="17.09" y1="6.91" x2="18.79" y2="5.21" /></g></svg>);
    default: return (<svg {...c}><circle cx="12" cy="12" r="8" /></svg>);
  }
}
