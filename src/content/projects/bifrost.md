---
title: Bifrost
order: 2
credit: solo
slug: "INT. WINDOWS 11 — ONE LOCAL MODEL"
headline: ["Your model.", "Your machine."]
logline: "A screen assistant, a code chat app and a terminal coding agent, all on one local model. Every edit is shown as an exact diff before it is written."
pin: false
world:
  fill: "#7FD6EE"
  onFill: "#071419"
  textDark: "#A5E6F7"
  textLight: "#0B6B86"
  tintDark: "#071419"
  tintLight: "#E4F5FA"
  secondaryDark: "#B9A9FF"
  secondaryLight: "#5A45B8"
stack: [Rust, Tauri, React, TypeScript, Ollama]
repo: https://github.com/LuisZarate17/bifrost
role: "Solo project. Built the shared Rust engine and all three apps, the guards on model-written code, and the hidden-test benchmark that chose the coding model."
metrics:
  - { value: "3", label: "apps on one local model: Vidar, Mimir and Hugin" }
  - { value: "1,100+", label: "Rust unit tests" }
  - {
      value: "76%",
      label: "of real repo tasks passed by the chosen model, vs 43% for the baseline",
    }
---
