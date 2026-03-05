# Verinite AI Customer Onboarding Application

A modern customer onboarding application built with Next.js, TypeScript, and Docker. This application integrates with an address verification service to validate customer addresses during the onboarding process.

## Features

- Multi-step customer onboarding form
- Address verification integration
- Responsive design with Tailwind CSS
- Docker containerization
- TypeScript for type safety

## Prerequisites

- Docker and Docker Compose
- Node.js 20.x or later
- npm or yarn

## Getting Started

### Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Docker Setup

This project includes Docker configuration for both development and production environments.

#### Development with Docker

1. Build and start the development containers:
   ```bash
   docker-compose up --build
   ```
2. The application will be available at [http://localhost:3000](http://localhost:3000)
3. The backend API will be available at [http://localhost:5000](http://localhost:5000)

#### Production Build

To build and run the production containers:

```bash
docker-compose -f docker-compose.prod.yml up --build
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
GROQ_API_KEY=your_groq_api_key
GROQ_OCR_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
GROQ_KYC_EXTRACTION_MODEL=openai/gpt-oss-120b
# Add other environment variables as needed
```

## Project Structure

```
verinite-ai-customer-onboard-app/
├── app/                    # Next.js app directory
│   ├── page.tsx            # Main page component
│   └── ...
├── src/
│   └── components/         # Reusable components
│       └── Form/           # Multi-step form components
├── public/                 # Static files
├── .dockerignore
├── .env.example           # Example environment variables
├── docker-compose.yml     # Development docker-compose
├── docker-compose.prod.yml # Production docker-compose
├── Dockerfile             # Development Dockerfile
├── Dockerfile.prod        # Production Dockerfile
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Docker Commands

- Build and start all services:
  ```bash
  docker-compose up --build
  ```
- Stop all services:
  ```bash
  docker-compose down
  ```
- View logs:
  ```bash
  docker-compose logs -f
  ```
- Run a command in a specific service:
  ```bash
  docker-compose exec web npm run lint
  ```

## Troubleshooting

- If you encounter port conflicts, check and stop any processes using ports 3000 (frontend) or 5000 (backend).
- Ensure all environment variables are properly set in your `.env` file.
- If Docker build fails, try cleaning up Docker resources:
  ```bash
  docker system prune -a
  docker volume prune
  ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
