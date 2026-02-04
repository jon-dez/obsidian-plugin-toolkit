# Esbuild Obsidian

Supercharge your Obsidian plugin development workflow with a build tool that
bridges the gap between esbuild and the Obsidian runtime.

## Hot Reload

Uses esbuild SSEs to instruct your in-development plugin to reload.

## Obsidian Development Server

A proxy around esbuild's `context.serve()` exposes development related endpoints
to Obsidian. Allows for remote development by instructing the development shim to download the files hosted by esbuild's serve command to the connected Obsidian instance.

## Development Shimming

Adds development-only "shims" to Obsidian APIs in order to facilitate
development.
