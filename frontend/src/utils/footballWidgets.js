const SCRIPT_ID = "api-football-widget-script";
const SCRIPT_SRC = "https://widgets.api-sports.io/2.0.3/widgets.js";

// El script de api-sports inicializa los widgets escuchando "DOMContentLoaded"
// en window. En una SPA ese evento ya disparó antes de que el script externo
// termine de cargar (o antes de que el componente con el widget se monte), por
// lo que el listener nunca se ejecuta. Lo volvemos a disparar manualmente cada
// vez que un componente con un widget se monta.
export const loadFootballWidgets = () => {
  const trigger = () => window.dispatchEvent(new Event("DOMContentLoaded"));

  if (document.getElementById(SCRIPT_ID)) {
    trigger();
    return;
  }

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.onload = trigger;
  document.body.appendChild(script);
};
