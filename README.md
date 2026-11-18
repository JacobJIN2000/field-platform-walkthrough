# Field Platform — study walkthrough

An English, browser-only presentation of the study's AI and control conditions.

**Presentation:** https://jacobjin2000.github.io/field-platform-walkthrough/

## Presenting the study

- Choose **AI group** or **Control group**.
- Follow **Previous / Next**, or select any of the 28 configured steps.
- Switch groups at the same step to compare the participant experience.
- Hide presenter notes to enlarge the original participant interface.
- Learning materials, forms and practice questions can be explored interactively.
- AI replies are explicitly labelled illustrative examples; no model is called.
- Use **Start over** to clear practice responses from this browser tab.

The participant interface and its styles are reused from the local study application. Content is a snapshot exported on 18 November 2026. Both configured competition conditions (0 and 1) are available.

## Static behaviour

This is a presentation, not a live research deployment. Form submissions, practice responses and example conversations remain in session storage in the current browser tab. No research responses or tracking events are submitted. Timers and session transitions are simulated locally. Practice review uses the published question explanations and scores only the responses entered in the preview.

The study content and answer keys are included with the project owner's explicit authorization for public presentation. The package contains no PHP backend, SQL dumps, participant records, login credentials or model API keys. Existing compiled third-party assets retain their embedded notices.

## Local preview

Serve this directory with any static web server, for example:

```sh
python3 -m http.server 8770 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8770/`. A web server is needed for ES modules and JSON assets; opening `index.html` as a local file is not supported.

## GitHub Pages

Publish the repository root from the `main` branch. `.nojekyll` preserves the existing asset paths. All media URLs resolve relative to the site directory, including GitHub project sites.
