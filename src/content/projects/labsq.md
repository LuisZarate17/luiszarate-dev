---
title: LabsQ
order: 1
tagline: Lab equipment reservation API, used to find, fix and measure two database bugs.
color: "#F59E1B"
stack: [C#, .NET 10, PostgreSQL 17, Docker, k6, Grafana]
repo: https://github.com/LuisZarate17/labqueue
live: https://labqueue-api.onrender.com/docs
role: Solo project.
metrics:
  - { value: "50 → 1", label: "confirmed bookings for one slot under a 50-request race" }
  - { value: "2.13×", label: "availability throughput after indexing" }
  - { value: "26.9×", label: "faster query execution" }
---
