---
title: LabQ
order: 1
credit: solo
slug: "INT. POSTGRES 17 — READ COMMITTED"
headline: ["50 bookings.", "One slot."]
logline: "Fifty simultaneous bookings for one lab slot all succeeded. I measured the race, closed it with an exclusion constraint, then measured again."
pin: true
world:
  fill: "#F59E1B"
  onFill: "#1A1206"
  textDark: "#FFB648"
  textLight: "#8F5400"
  tintDark: "#1A1206"
  tintLight: "#FFF3DC"
stack: [C#, .NET 10, PostgreSQL 17, Docker, k6, Grafana]
repo: https://github.com/LuisZarate17/labqueue
live: https://labqueue-api.onrender.com/docs
role: "Solo project. Designed and built the API, found both database bugs with my own concurrency and k6 load tests, fixed them, and published the before-and-after numbers."
metrics:
  - { value: "50 → 1", label: "confirmed bookings when 50 race for one slot" }
  - { value: "2.13×", label: "availability throughput after indexing" }
  - { value: "26.9×", label: "faster availability query" }
---
