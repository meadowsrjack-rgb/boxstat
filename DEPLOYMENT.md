# Contributing to BoxStat League App

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Use Prettier for code formatting
- Add JSDoc comments for complex functions

### Database Changes
- Always use Drizzle ORM for schema changes
- Run `npm run db:push` to apply changes
- Never write raw SQL migrations
- Update shared/schema.ts for new tables

### API Development
- Add proper error handling
- Use Zod schemas for validation
- Follow RESTful conventions
- Document new endpoints

### Frontend Development
- Use React functional components
- Implement proper loading states
- Add data-testid attributes for testing
- Follow accessibility guidelines

### Testing
- Test all new features in demo mode
- Verify PWA functionality on iOS
- Test real-time features
- Validate payment flows

## Pull Request Process

1. Create feature branch from main
2. Make your changes
3. Test thoroughly
4. Update documentation
5. Submit pull request with description

## Getting Help

- Check replit.md for project context
- Review existing code patterns
- Ask questions in development chat
- Consult external API documentation