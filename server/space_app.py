"""Hugging Face Space entry point (Gradio SDK on free ZeroGPU hardware).

Free accounts can only create ZeroGPU Spaces for Gradio, and ZeroGPU only starts an app that has a Gradio
interface with at least one @spaces.GPU function. Subah never uses a GPU: this file adds a tiny hidden Gradio
interface (mounted at /gradio) with one placeholder GPU function, and serves the real site and API at the root.
Run locally with:  python -m server.space_app
"""
from __future__ import annotations

import os

os.environ.setdefault("SUBAH_SOURCE", "live")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ["GRADIO_SSR_MODE"] = "false"

try:
    import spaces  # present only on Hugging Face Spaces

    gpu = spaces.GPU
except ImportError:
    def gpu(fn):
        return fn

import gradio as gr
from starlette.routing import Mount

from server.app import app as subah_app


@gpu
def placeholder() -> str:
    """Never called by the site; it exists because ZeroGPU requires one GPU function."""
    return "Subah does not use the GPU."


with gr.Blocks(title="Subah (internal)") as demo:
    gr.Markdown("Subah runs at the site root. This page only exists for the Space's hardware check.")
    check = gr.Button("Check")
    out = gr.Textbox(label="Result")
    check.click(placeholder, inputs=None, outputs=out)

def report_to_zerogpu() -> None:
    """ZeroGPU's startup report normally runs inside gradio's Blocks.launch(), which this app never calls
    (uvicorn serves it). Without the report the Space stops with "No @spaces.GPU function detected during
    startup", so send the same report here. Does nothing off Hugging Face."""
    try:
        import spaces.zero as zero
    except ImportError:
        return
    startup = getattr(zero, "startup", None)  # defined only when the Space runs on ZeroGPU
    if startup is not None:
        startup()


report_to_zerogpu()

# ssr_mode=False: on Spaces, Gradio's server-side rendering starts a Node server that takes port 7860
# before uvicorn can bind it ("address already in use").
app = gr.mount_gradio_app(subah_app, demo, path="/gradio", ssr_mode=False)

# The site's static files are mounted at "/" and would catch /gradio first: move the Gradio mount ahead of them.
routes = app.router.routes
gradio_mounts = [r for r in routes if isinstance(r, Mount) and r.path == "/gradio"]
for r in gradio_mounts:
    routes.remove(r)
root_index = next((i for i, r in enumerate(routes) if isinstance(r, Mount) and r.path in ("", "/")), len(routes))
routes[root_index:root_index] = gradio_mounts

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "7860")))
