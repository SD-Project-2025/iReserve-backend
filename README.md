[![codecov](https://codecov.io/gh/SD-Project-2025/iReserve-backend/branch/main/graph/badge.svg)](https://codecov.io/gh/SD-Project-2025/iReserve-backend)
# iReserve-backend

**iReserve API**

A RESTful API for managing community sports facilities, bookings, maintenance reports, events, and notifications.

---

## 🚀 Features

- 🧑💼 **User Authentication**: Google OAuth integration with JWT token management
- 🏟️ **Facility Management**: CRUD operations for sports facilities (Admin/Staff only)
- 📅 **Booking System**: Residents can book facilities with availability validation
- 🛠️ **Maintenance Reporting**: Submit and track maintenance requests (Residents) with status updates (Staff/Admin)
- 🎉 **Event Management**: Create and manage community events with resident registration
- 🔔 **Notifications**: Real-time updates for bookings, maintenance, and events
- 🔐 **Role-Based Access Control**:
  - Admin: Full system control
  - Staff: Facility/event management and report handling
  - Resident: Booking, reporting, and event registration

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (with Sequelize ORM)
- **Authentication**: Google OAuth 2.0, JWT
- **API Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest (Unit & Integration), Supertest
- **CI/CD**: GitHub Actions (Add status badge if implemented)
- **Hosting**: [Specify if deployed e.g., AWS EC2, Heroku]

---

## 📦 Getting Started

### ✅ Prerequisites

- Node.js v16+
- PostgreSQL 14+ (or Neon Tech PostgreSQL)
- Google OAuth credentials

### ⚙️ Environment Variables

Create `.env` file using `.env.example` with these required variables:
```ini
PORT=5000
DATABASE_URL=postgres://user:pass@host:port/dbname
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

### 📥 Installation

```bash
# Clone repository
git clone https://github.com/SD-Project-2025/iReserve-backend.git
cd iReserve-backend

# Install dependencies
npm install

# Initialize database (ensure PostgreSQL is running)
npm run migrate

# Start development server
npm run dev
```

---

## 📖 API Documentation

Interactive API documentation available via Swagger UI:  
http://localhost:5000/api-docs

---

## 🔐 Authentication Endpoints

| Endpoint | Method | Description | Roles |
|----------|--------|-------------|-------|
| `/api/v1/auth/google` | POST | Google OAuth login/registration | All |
| `/api/v1/auth/me` | GET | Get current user profile | All |
| `/api/v1/auth/address` | PUT | Update resident address | Resident |
| `/api/v1/auth/logout` | POST | Invalidate JWT token | All |

---

## 🏟️ Facility Endpoints (Admin/Staff Restricted)

| Endpoint | Method | Description | Roles |
|----------|--------|-------------|-------|
| `/api/v1/facilities` | POST | Create new facility | Admin/Staff |
| `/api/v1/facilities/:id` | PUT | Update facility details | Admin/Staff |
| `/api/v1/facilities/:id` | DELETE | Delete facility | Admin |
| `/api/v1/facilities/:id/staff` | POST | Assign staff to facility | Admin |
| `/api/v1/facilities/:id/staff` | GET | View assigned staff | Admin/Staff |

---

## 📅 Booking Endpoints

| Endpoint | Method | Description | Roles |
|----------|--------|-------------|-------|
| `/bookings` | GET | List all bookings | Admin/Staff |
| `/bookings/my-bookings` | GET | Get user's bookings | Resident |
| `/bookings` | POST | Create new booking | Resident |
| `/bookings/:id/status` | PUT | Update booking status | Admin/Staff |
| `/bookings/:id/cancel` | PUT | Cancel booking | Resident |

---

## 🛠️ Maintenance Endpoints

| Endpoint | Method | Description | Roles |
|----------|--------|-------------|-------|
| `/maintenance` | GET | List all reports | Admin/Staff |
| `/maintenance/my-reports` | GET | Get user's reports | Resident |
| `/maintenance` | POST | Submit new report | Resident |
| `/maintenance/:id/status` | PUT | Update report status | Admin/Staff |

---

## 🎉 Event Endpoints

| Endpoint | Method | Description | Roles |
|----------|--------|-------------|-------|
| `/api/v1/events` | POST | Create new event | Admin/Staff |
| `/api/v1/events/:id` | PUT | Update event details | Admin/Staff |
| `/api/v1/events/:id` | DELETE | Delete event | Admin/Staff |
| `/api/v1/events/:id/register` | POST | Register for event | Resident |
| `/api/v1/events/:id/cancel-registration` | PUT | Cancel registration | Resident |

---

## 🔔 Notification Endpoints

| Endpoint | Method | Description | Roles |
|----------|--------|-------------|-------|
| `/api/v1/notifications` | GET | Get user notifications | All |
| `/api/v1/notifications/:id/read` | PUT | Mark notification as read | All |
| `/api/v1/notifications/read-all` | PUT | Mark all as read | All |
| `/api/v1/notifications/:id` | DELETE | Delete notification | All |

---

## 🧪 Testing

```bash
# Run full test suite
npm test

# Generate coverage report (outputs to /coverage)
npm run test:coverage

# Test specific module
npm test -- facilities.test.js
```

---

**Requirements**:
- Write tests for new features
- Integrate better code coverage (80%+)
- Update Swagger documentation
- Follow ESLint coding standards

---
