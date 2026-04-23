# Ticketing System – 

## Overview

This project is a full-stack ticketing web application developed It enables users to create and manage tickets while agents can view, respond to, and resolve them. The application has been extended from the previous version to include authentication, real-time communication, and an improved user interface.

## Key Enhancements

### Authentication and Multi-User Support

Authentication was implemented using JSON Web Tokens (JWT). This allows multiple users to log in simultaneously while ensuring that each user can only access their own data. Tickets are associated with user IDs in the database, providing proper data isolation. Protected routes are enforced through middleware to ensure secure access.

### Real-Time Communication

Socket.io was integrated to support real-time communication between users and agents. Each ticket acts as a separate communication channel (room), allowing both parties to exchange messages instantly. The system also supports typing indicators and live updates, improving responsiveness and interaction without requiring page refresh.

### User Interface Redesign

The user interface was redesigned based on Nielsen’s usability principles. The focus was on improving clarity, consistency, and usability while maintaining a Neo-Brutalist design style.

Key improvements include:

* Consistent spacing and layout across components
* Structured and reusable form components
* Clear visual hierarchy for better readability
* Immediate feedback through alerts and real-time updates
* Responsive design for different screen sizes

## Project Structure

### Backend (Node.js, Express, MongoDB)

* models/

  * User.js: manages user accounts
  * Ticket.js: stores ticket data associated with users
* routes/

  * authentication routes (login and signup)
  * API routes for ticket operations
* middleware/

  * JWT verification for protected routes
* server.js

  * Express server with Socket.io integration

### Frontend (React, Vite)

* pages/

  * user and agent dashboards
  * ticket detail and chat views
* components/

  * API and authentication utilities
* styles.css

  * Neo-Brutalist design system with improved spacing and layout

## How to Run

### Backend

cd backend
npm install
cp .env.example .env
npm start

### Frontend

cd frontend
npm install
npm run dev

## Demo Instructions

1. Open one normal browser window and one incognito window.
2. Log in as a user in one and as an agent in the other.
3. Open the same ticket on both sides.
4. Send messages and observe real-time updates.

## Technologies Used

Frontend: React, Vite, CSS
Backend: Node.js, Express
Database: MongoDB with Mongoose
Real-Time Communication: Socket.io
Authentication: JWT

## Learning Outcomes

This project provided practical experience in full-stack development, real-time systems, authentication, and user-centered design. It demonstrated how to build scalable and interactive web applications while applying usability principles to improve the user experience.
