# Candidate Screening Tool

An AI-powered candidate evaluation platform that allows you to create custom rubrics and batch process candidate profiles using OpenAI's completion API.

## Features

- **Custom Rubrics**: Create evaluation criteria with customizable scoring guidelines (1-5 scale)
- **Batch Processing**: Evaluate multiple candidates against multiple rubrics automatically
- **AI-Powered Scoring**: Uses OpenAI GPT-4 to evaluate candidates with detailed explanations
- **Real-time Progress**: Track evaluation progress with visual indicators
- **Results Carousel**: View top-ranked candidates for each rubric in an interactive carousel
- **Detailed Views**: Click on any candidate to see comprehensive evaluation details

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd candidate-screening
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory and add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

To get an OpenAI API key:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API keys section
4. Create a new secret key
5. Copy the key and paste it in `.env.local`

### 4. Run the Application

For development:
```bash
npm run dev
```

For production build:
```bash
npm run build
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Usage Guide

### Creating Rubrics

1. Click **"Create New Rubric"** in the left panel
2. Enter a title for your rubric (e.g., "Technical Skills Assessment")
3. Click **"Add Item"** to add evaluation criteria
4. For each item:
   - Enter a description (e.g., "Years of relevant experience")
   - Define what each score (1-5) means
5. Click **"Save Rubric"** when done

### Example Rubric Items

**Years of Experience:**
- Score 1: 0-1 years of experience
- Score 2: 2-3 years of experience
- Score 3: 4-5 years of experience
- Score 4: 6-8 years of experience
- Score 5: 9+ years of experience

**Technical Skills:**
- Score 1: Basic knowledge, limited practical experience
- Score 2: Some hands-on experience, needs guidance
- Score 3: Competent, can work independently
- Score 4: Advanced skills, can mentor others
- Score 5: Expert level, industry leader

### Running Evaluations

1. Create at least one rubric
2. Click **"Run Evaluation"** in the right panel
3. The system will:
   - Process each rubric sequentially
   - Evaluate all 5 loaded profiles
   - Show real-time progress
   - Display results when complete

### Viewing Results

- Results are displayed in a horizontal carousel
- Each card shows:
  - Candidate name and location
  - Average score for the rubric
  - Basic work experience and education
- Click on any card to see detailed scoring with explanations
- Navigate between different rubrics using arrow buttons

## Data Format

The application loads candidate data from `data/form-submissions.json`. The first 5 profiles are automatically loaded. Each profile includes:

- Personal information (name, email, phone, location)
- Work availability and salary expectations
- Work experience history
- Educational background
- Skills list

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Radix UI primitives
- **AI Integration**: OpenAI GPT-4 API

### Key Components
- **LeftPanel**: Rubric management interface
- **RightPanel**: Evaluation controls and results display
- **RubricModal**: Create and edit rubrics
- **EvaluationRunner**: Handles batch processing logic
- **ResultsCarousel**: Displays ranked candidates

## API Endpoints

- `GET /api/profiles` - Returns the first 5 candidate profiles
- `POST /api/evaluate` - Evaluates a single profile against a rubric

## Troubleshooting

### Common Issues

1. **Build errors**: Ensure all dependencies are installed with `npm install`

2. **OpenAI API errors**: 
   - Verify your API key is correct
   - Check your OpenAI account has credits
   - Ensure the API key has the necessary permissions

3. **Evaluation not working**:
   - Create at least one rubric first
   - Check browser console for errors
   - Ensure `.env.local` file exists with valid API key

### Development Tips

- Use `npm run dev` for hot-reload during development
- Check `npm run lint` to fix linting issues
- Run `npm run build` before deployment to catch type errors

## Performance Considerations

- The application processes evaluations serially to avoid rate limiting
- Each evaluation typically takes 2-3 seconds per profile per rubric item
- Results are cached in memory during the session

## Security Notes

- Never commit `.env.local` to version control
- The OpenAI API key is only used server-side
- Input sanitization is applied to all rubric descriptions

## Future Enhancements

Potential improvements for future versions:
- Database integration for persistent storage
- User authentication and multi-tenancy
- Export results to CSV/PDF
- Bulk profile upload
- Custom scoring algorithms
- Integration with ATS systems

## License

MIT

## Support

For issues or questions, please open an issue on the GitHub repository.