# SpreadB - Influencer Marketing Platform

SpreadB is a mobile application that connects **Brand Owners** with **Influencers** for marketing campaigns. It's a marketplace where brands can post promotional opportunities and influencers can apply, collaborate, and earn.

## 🚀 Features

### For Brand Owners
- ✅ Create promotional campaigns with budget and requirements
- ✅ Browse and search influencers by niche
- ✅ Review influencer applications and proposals
- ✅ Accept/reject proposals
- ✅ Direct messaging with influencers
- ✅ Create and manage agreements/contracts
- ✅ Track campaign performance
- ✅ Integrated payment system

### For Influencers
- ✅ Browse available brand campaigns
- ✅ Apply to campaigns matching your niche
- ✅ Submit proposals with reach/engagement stats
- ✅ Chat with brands about opportunities
- ✅ Accept agreements and track earnings
- ✅ Submit campaign content
- ✅ Manage applications and wallet

## 📁 Project Structure

```
spreadB_New/
├── spreadb_mobile/          # React Native mobile app (Expo)
│   ├── src/
│   │   ├── api/            # API calls and configuration
│   │   ├── context/        # React context (Auth, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── navigation/     # Navigation setup
│   │   ├── screens/        # All app screens
│   │   │   ├── auth/       # Login, signup, OTP
│   │   │   ├── home/       # Home screen
│   │   │   ├── messages/   # Chat functionality
│   │   │   ├── applications/ # Applications & proposals
│   │   │   ├── agreements/ # Agreements/contracts
│   │   │   ├── profile/    # User profiles
│   │   │   └── promotions/ # Campaign management
│   │   └── theme/          # Colors and styling
│   └── package.json
│
├── spreadb_project/         # Node.js backend server
│   ├── controller/         # Business logic
│   ├── model/             # MongoDB schemas
│   ├── route/             # API routes
│   ├── middleware/        # Auth & validation
│   ├── utils/             # Helper functions
│   └── server.js          # Express server
│
└── spreadb_app/            # Legacy/backup code
```

## 🛠️ Tech Stack

### Mobile App
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **UI**: React Native components with custom styling

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)
- **Payment Gateway**: Razorpay
- **Email**: Nodemailer
- **OAuth**: Google Sign-In

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Expo CLI (`npm install -g expo-cli`)
- Android Studio or Xcode (for emulators)

### Backend Setup

1. Navigate to backend directory:
```bash
cd spreadb_project
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your credentials:
```env
MONGO_URI=your-mongodb-connection-string
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
JWT_SECRET=your-secret-key
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

5. Start the server:
```bash
npm start
```

Backend will run on `http://localhost:3001`

### Mobile App Setup

1. Navigate to mobile app directory:
```bash
cd spreadb_mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update API configuration:

Edit `src/api/config.js`:
```javascript
// For local development, use your machine's IP address
export const BASE_URL = 'http://YOUR_LOCAL_IP:3001';

// For production
export const BASE_URL = 'https://your-production-url.com';
```

**Find your local IP:**
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` or `ip addr`

4. Start Expo:
```bash
npx expo start
```

5. Scan QR code with Expo Go app (iOS/Android) or press:
- `a` for Android emulator
- `i` for iOS simulator
- `w` for web browser

## 🔧 Configuration

### WiFi Network Issues

If you get "Network Error" after changing WiFi:

1. Find your new IP address:
```bash
# Windows
ipconfig | findstr IPv4

# Mac/Linux
ifconfig | grep inet
```

2. Update `spreadb_mobile/src/api/config.js`:
```javascript
export const BASE_URL = 'http://YOUR_NEW_IP:3001';
```

3. Restart Expo app

## 🗄️ Database Models

- **User**: Authentication and basic user data
- **InfluencerProfile**: Influencer-specific data (followers, niche, rates)
- **BrandOwnerProfile**: Brand-specific data (company, industry)
- **Promotion**: Campaign details created by brands
- **Application**: Influencer applications to campaigns
- **Message**: Chat messages between users
- **Conversation**: Chat conversations
- **Agreement**: Digital contracts
- **Notification**: In-app notifications
- **Wallet**: Payment tracking

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Environment variable protection
- XSS prevention in messaging

## 📱 Key Features Implementation

### Authentication
- Email/Password signup and login
- OTP verification via email
- Google OAuth integration
- JWT token management
- Role-based access (Brand Owner / Influencer)

### Messaging System
- Real-time messaging between brands and influencers
- Conversation management
- Message read status
- File attachments (planned)
- Message history with pagination

### Application Flow
1. Brand creates a promotion/campaign
2. Influencers browse and apply
3. Brand reviews applications
4. Brand accepts/rejects proposals
5. Agreement is created
6. Chat opens for collaboration
7. Influencer submits content
8. Payment is processed

## 🚧 Known Issues

- Messages may show on one side if backend server is not restarted after changes
- Network errors occur when WiFi IP changes (update config.js)
- File uploads in chat are not yet implemented

## 📄 API Documentation

### Base URL
```
Development: http://localhost:3001
Production: https://spreadb.flyhii.in
```

### Main Endpoints

**Authentication**
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

**Promotions**
- `GET /api/promotions` - Get all promotions
- `POST /api/promotions` - Create promotion (Brand Owner)
- `GET /api/promotions/:id` - Get promotion details

**Applications**
- `POST /api/applications` - Apply to promotion
- `GET /api/applications/my-applications` - Get my applications
- `GET /api/applications/proposals` - Get received proposals

**Messages**
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages/send` - Send message

**Profile**
- `GET /api/profile` - Get profile
- `POST /api/profile/influencer` - Create influencer profile
- `POST /api/profile/brand` - Create brand profile

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Developer

**Ganesh Datti**
- Email: ganeshdatti3384@gmail.com
- GitHub: [@ganeshdatti3384-cpu](https://github.com/ganeshdatti3384-cpu)

## 🙏 Acknowledgments

- React Native and Expo communities
- MongoDB Atlas
- Razorpay for payment integration
- All contributors and testers

## 📞 Support

For issues, questions, or suggestions:
- Create an issue on GitHub
- Email: ganeshdatti3384@gmail.com

---

**Note**: Remember to never commit sensitive data like API keys, passwords, or `.env` files to the repository!
