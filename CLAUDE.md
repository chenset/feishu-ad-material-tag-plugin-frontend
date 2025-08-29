# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Feishu (Lark Base) plugin frontend for automatically tagging advertising materials using AI. The plugin integrates with Feishu's Base SDK to analyze images in attachment fields and populate tag fields with detected elements, styles, themes, and copywriting suggestions.

## Development Commands

- **Start development server**: `npm run dev` or `yarn run start`
- **Build for production**: `npm run build` 
- **Preview production build**: `npm run preview`
- **Install dependencies**: `yarn` (preferred) or `npm install`

Development server runs on port 3000 with host 0.0.0.0 for external access.

## Architecture

### Core Technologies
- **React 18** with TypeScript
- **Vite** as build tool and dev server
- **Lark Base Open SDK** (`@lark-base-open/js-sdk`) for Feishu integration
- **Ant Design** for UI components
- **Axios** for HTTP requests
- **i18next** for internationalization

### Main Application Structure

The app is a single-page React application (`src/index.tsx`) that:

1. **Field Selection**: Users select attachment fields (for images) and tag fields (multi-select for elements/styles/themes, text for copywriting)
2. **Batch Processing**: Iterates through visible records in the current Feishu Base view
3. **API Integration**: Calls external tagging API using custom JSONP implementation
4. **Field Population**: Writes AI-generated tags back to selected Feishu fields

### Key Components

- **Main App Component** (`LoadApp`): Handles field selection, API calls, and result processing
- **Custom JSONP Client** (`jsonpRequest`): Handles cross-origin API requests with Base64 parameter encoding
- **Exchange Rate API** (`src/exchange-api.ts`): Utility for currency conversion (may be unused)

### Feishu Base Integration

The app works with four field types:
- **Attachment fields**: Source images for analysis
- **Multi-select fields**: For element, style, and theme tags
- **Text fields**: For copywriting suggestions
- **Single-select fields**: Available but currently unused

### API Communication

Uses custom JSONP implementation to call external AI tagging service. Default endpoint is configurable via UI. Request includes:
- Image URLs from attachment fields
- Record and table IDs for context
- Base64-encoded parameters for cross-origin compatibility

## Development Notes

- Field selections are cached in localStorage with key `selectField_v1`
- Custom API URL is persisted in localStorage as `customApiUrl`
- Processing logs are displayed in real-time with status tracking
- The app skips records where target fields already have values
- Only processes image/video attachments, skips other file types

## Configuration

- **TypeScript**: Strict mode enabled with ESNext target
- **Vite**: Configured for React with polling file watcher for container environments
- **Node version**: Requires Node 16+