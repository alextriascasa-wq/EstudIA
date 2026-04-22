# EstudIA

AI-powered study assistant that helps students understand material, generate summaries, create practice questions, and get explanations on demand.

## Tech Stack
<!-- Fill in when decided -->
- Frontend:
- Backend:
- AI: Claude API (claude-sonnet-4-6) via Anthropic SDK
- Database:

## Dev Commands
<!-- Fill in when project is scaffolded -->
```bash
# Install dependencies
npm install          # or: pip install -r requirements.txt

# Start dev server
npm run dev          # or: uvicorn main:app --reload

# Run tests
npm test             # or: pytest

# Lint / format
npm run lint         # or: ruff check .
```

## Architecture
```
estudia/
├── frontend/        # UI (components, pages, styles)
├── backend/         # API routes, business logic
│   ├── ai/          # Claude API integration, prompt templates
│   └── db/          # Database models and queries
└── shared/          # Shared types/utils between front and back
```

## Conventions
- Use TypeScript strict mode (or Python type hints) everywhere
- Keep AI prompt templates in `backend/ai/prompts/` — never inline them
- One concern per file; keep files under 300 lines
- Use environment variables for all secrets — never hardcode API keys

## AI Integration
- Model: `claude-sonnet-4-6` for study explanations and Q&A
- Always use prompt caching for large document contexts (saves cost)
- System prompts live in `backend/ai/prompts/` as `.txt` files
- Never log or store raw API responses that may contain student PII

## Important Constraints
- Never commit `.env` files or API keys
- Never expose the Anthropic API key to the frontend
- All student data must stay on-device or be explicitly consented to
