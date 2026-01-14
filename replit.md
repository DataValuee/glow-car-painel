# Glow Car Detailing - Sistema de Relatório de Entrega

A delivery report management system for a car detailing business.

## Overview

This is a React + TypeScript + Vite application with Supabase backend integration. The app provides:
- Login authentication
- Dashboard (Painel)
- New delivery creation (Nova Entrega)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7
- **Styling**: Tailwind CSS 4, Radix UI components
- **State Management**: TanStack React Query
- **Backend**: Supabase (requires configuration)
- **Forms**: React Hook Form with Zod validation

## Project Structure

```
src/
├── components/     # UI components (Radix-based)
├── hooks/          # Custom React hooks
├── integrations/   # Supabase client and types
├── lib/            # Utility functions
├── pages/          # Route pages (Login, Painel, NovaEntrega)
└── services/       # API service functions
```

## Environment Variables

The app requires the following environment variables to connect to Supabase:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key

## Running the App

Development server runs on port 5000:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Deployment

Configured for static deployment with the built files served from the `dist` directory.
