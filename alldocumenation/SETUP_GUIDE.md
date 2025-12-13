# Mental Health Chat Analyzer - Complete Setup Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Database Configuration](#database-configuration)
6. [Running the Application](#running-the-application)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

Mental Health Chat Analyzer is a full-stack application that analyzes text messages and conversations to provide mental health insights, sentiment analysis, and personalized recommendations.

**Tech Stack:**
- **Backend**: Python + FastAPI + MongoDB
- **Frontend**: React + JavaScript
- **AI/ML**: HuggingFace Transformers (emotion & sentiment models)
- **Reports**: ReportLab + Matplotlib

---

## 📦 Prerequisites

### Required Software

1. **Python 3.8+**
   ```bash
   python --version  # Should be 3.8 or higher
   ```

2. **Node.js 14+**
   ```bash
   node --version  # Should be 14 or higher
   npm --version
   ```

3. **MongoDB 4.4+**
   - Download from: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

4. **Git** (for cloning repository)
   ```bash
   git --version
   ```

---

## 🔧 Backend Setup

### Step 1: Navigate to Backend Directory
```bash
cd c:\chat_analyzer\mental-health-backend
```

### Step 2: Create Virtual Environment (Recommended)
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Windows CMD)
venv\Scripts\activate.bat

# Activate (Mac/Linux)
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

**Core Dependencies:**
- `fastapi==0.104.1` - Web framework
- `uvicorn==0.24.0` - ASGI server
- `motor==3.3.2` - Async MongoDB driver
- `pydantic==2.5.0` - Data validation
- `python-jose[cryptography]==3.3.0` - JWT authentication
- `passlib[bcrypt]==1.7.4` - Password hashing
- `transformers==4.35.2` - HuggingFace AI models
- `torch==2.1.1` - PyTorch (AI backend)
- `emoji==2.8.0` - Emoji handling
- `reportlab==4.0.7` - PDF generation
- `matplotlib==3.8.2` - Chart generation
- `pillow==10.1.0` - Image processing

### Step 4: Create Environment File
Create `.env` file in `mental-health-backend/`:
```env
# Database
DATABASE_URL=mongodb://localhost:27017
DATABASE_NAME=mental_health_db

# Security
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# AI Models (optional - will auto-download)
SENTIMENT_MODEL=cardiffnlp/twitter-roberta-base-sentiment-latest
EMOTION_MODEL=j-hartmann/emotion-english-distilroberta-base
```

### Step 5: Verify Installation
```bash
python -c "import fastapi, transformers, motor, reportlab; print('✅ All backend packages installed')"
```

---

## 🎨 Frontend Setup

### Step 1: Navigate to Frontend Directory
```bash
cd c:\chat_analyzer\mental-health-frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

**Core Dependencies:**
- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `axios` - HTTP client

### Step 3: Create Environment File
Create `.env` file in `mental-health-frontend/`:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENABLE_VOICE=true
```

### Step 4: Verify Installation
```bash
npm list react react-dom
# Should show installed versions without errors
```

---

## 💾 Database Configuration

### Option 1: Local MongoDB

1. **Install MongoDB Community Server**
   - Download from: https://www.mongodb.com/try/download/community
   - Install with default settings

2. **Start MongoDB Service**
   ```bash
   # Windows (as Administrator)
   net start MongoDB

   # Mac
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

3. **Verify Connection**
   ```bash
   # Connect to MongoDB shell
   mongosh
   
   # Or check if running
   curl http://localhost:27017
   # Should return: "It looks like you are trying to access MongoDB over HTTP..."
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create Account** at https://www.mongodb.com/cloud/atlas
2. **Create Cluster** (free tier available)
3. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string
4. **Update Backend `.env`**:
   ```env
   DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

### Database Collections

The application will automatically create these collections:
- `users` - User accounts
- `analysis_history` - Message analyses
- `chat_analyses` - Bulk chat imports

---

## 🚀 Running the Application

### Step 1: Start MongoDB (if local)
```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Step 2: Start Backend
```bash
# Open Terminal 1
cd c:\chat_analyzer\mental-health-backend

# Activate virtual environment (if using)
.\venv\Scripts\Activate.ps1

# Start backend
python main.py
# OR
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Step 3: Start Frontend
```bash
# Open Terminal 2
cd c:\chat_analyzer\mental-health-frontend

# Start frontend
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view mental-health-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.1.x:3000
```

### Step 4: Access Application
Open browser and navigate to:
```
http://localhost:3000
```

---

## 🧪 Testing

### Backend API Testing

1. **Access Swagger Documentation**
   ```
   http://localhost:8000/docs
   ```

2. **Test Authentication**
   - Click "POST /auth/register"
   - Try it out
   - Enter test credentials
   - Execute
   - Should return: `{"message": "User registered successfully"}`

3. **Test Message Analysis**
   - First, login at POST /auth/login
   - Copy the access_token
   - Click "Authorize" button (top right)
   - Paste token
   - Try POST /analysis/analyze with: `{"message": "I'm feeling great today!"}`
   - Should return sentiment analysis

### Frontend Testing

1. **Registration**
   - Go to http://localhost:3000
   - Click "Sign Up"
   - Enter email and password
   - Should redirect to login

2. **Login**
   - Enter registered credentials
   - Should redirect to dashboard

3. **Single Message Analysis**
   - Navigate to "Analyze Chat" tab
   - Type: "I'm feeling wonderful today!"
   - Click "Analyze Message"
   - Should show: Sentiment: Positive, Confidence: 85-95%

4. **Bulk Import**
   - Click "Bulk Import" tab
   - Paste sample WhatsApp chat
   - Click "Analyze Chat"
   - Should show comprehensive analysis

5. **Dashboard**
   - Navigate to "Dashboard"
   - Should show statistics and mood trends

6. **PDF Reports**
   - Navigate to "Export & Reports"
   - Click "Download PDF Report"
   - Should download PDF with analysis

### Test Data Files

Use provided test files in `test-chats/`:
- `sample_whatsapp.txt` - WhatsApp format
- `sample_telegram.txt` - Telegram format

---

## 🐛 Troubleshooting

### Backend Issues

#### "ModuleNotFoundError: No module named 'X'"
**Solution:**
```bash
# Ensure virtual environment is activated
pip install -r requirements.txt
```

#### "Connection to MongoDB failed"
**Causes & Solutions:**
1. MongoDB not running:
   ```bash
   net start MongoDB  # Windows
   ```
2. Wrong connection string in `.env`:
   ```env
   DATABASE_URL=mongodb://localhost:27017
   ```
3. Firewall blocking port 27017:
   - Allow MongoDB through Windows Firewall

#### "AI models not loading"
**Solution:**
- First run downloads models (2-3 GB), takes 5-10 minutes
- Ensure internet connection
- Models saved to: `~/.cache/huggingface/`
- If download fails:
  ```bash
  pip install --upgrade transformers torch
  ```

#### Port 8000 already in use
**Solution:**
```bash
# Find process using port
netstat -ano | findstr :8000

# Kill process (Windows - as Administrator)
taskkill /PID <PID> /F

# Or use different port
uvicorn main:app --reload --port 8001
```

### Frontend Issues

#### "npm install" fails
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Port 3000 already in use
**Solution:**
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or specify different port
# Edit package.json:
"scripts": {
  "start": "set PORT=3001 && react-scripts start"
}
```

#### "Failed to fetch" / CORS errors
**Causes & Solutions:**
1. Backend not running:
   - Start backend first
2. Wrong API URL in frontend `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:8000
   ```
3. Backend CORS not configured:
   - Check backend `.env`:
   ```env
   CORS_ORIGINS=http://localhost:3000
   ```

#### Voice recognition not working
**Solution:**
- Voice is OPTIONAL feature
- Requires:
  - Chrome/Edge browser
  - Microphone permission
  - Internet connection (Google's API)
- If doesn't work, just type messages instead!

### Database Issues

#### Cannot connect to MongoDB
**Solution:**
```bash
# Check if MongoDB service is running
# Windows
sc query MongoDB

# If not running
net start MongoDB

# Test connection
mongosh
```

#### Database authentication failed
**Solution:**
- If using MongoDB Atlas:
  1. Check username/password in connection string
  2. Whitelist your IP in Atlas dashboard
  3. Ensure database user has correct permissions

#### "Cannot read property '_id' of undefined"
**Cause:** Database collection doesn't exist yet
**Solution:** Just start using the app - collections auto-create

---

## 📊 Performance Optimization

### Backend Optimization

1. **Enable Model Caching** (already implemented):
   - Models load once at startup
   - Cached in memory for fast analysis

2. **Database Indexing**:
   ```javascript
   // Run in mongosh
   use mental_health_db
   db.analysis_history.createIndex({ "user_id": 1, "timestamp": -1 })
   db.users.createIndex({ "email": 1 }, { unique: true })
   ```

3. **Adjust Worker Count** (production):
   ```bash
   uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
   ```

### Frontend Optimization

1. **Build for Production**:
   ```bash
   npm run build
   # Creates optimized build/ directory
   ```

2. **Serve Build** (production):
   ```bash
   npm install -g serve
   serve -s build -l 3000
   ```

---

## 🔐 Security Configuration

### Production Checklist

Backend `.env`:
```env
DEBUG=false  # Disable debug mode
JWT_SECRET=<use-a-long-random-string-here>  # Change default
CORS_ORIGINS=https://yourdomain.com  # Set production domain
```

### Generate Secure JWT Secret:
```python
import secrets
print(secrets.token_urlsafe(32))
# Use output as JWT_SECRET
```

### Enable HTTPS (Production):
```bash
# Using Nginx as reverse proxy
# Install SSL certificate (Let's Encrypt)
sudo certbot --nginx -d yourdomain.com
```

---

## 📈 Monitoring

### Backend Logs
```bash
# View logs in real-time
tail -f backend.log

# Or use Python logging
python main.py >> backend.log 2>&1
```

### Database Monitoring
```javascript
// Check database size
db.stats()

// Check collection counts
db.analysis_history.countDocuments({})
db.users.countDocuments({})
```

---

## 🎓 Next Steps

After successful setup:

1. **Create User Account** at http://localhost:3000
2. **Analyze Messages** to populate data
3. **Import Chat** for bulk analysis
4. **View Dashboard** for insights
5. **Generate Reports** (PDF)
6. **Explore Recommendations** and blogs

---

## 📞 Support Resources

### Documentation
- Architecture: See `ARCHITECTURE.md`
- Features: See `FEATURES.md`
- API Docs: http://localhost:8000/docs

### Common Commands

**Restart Everything:**
```bash
# Terminal 1: Backend
cd mental-health-backend
python main.py

# Terminal 2: Frontend
cd mental-health-frontend
npm start
```

**Check Status:**
```bash
# Backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000
```

**Clean Restart:**
```bash
# Backend
pip install --upgrade -r requirements.txt

# Frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## ✅ Setup Verification Checklist

Before considering setup complete:

**Backend:**
- [ ] Python 3.8+ installed
- [ ] Virtual environment created and activated
- [ ] All dependencies installed (no errors)
- [ ] `.env` file created with correct values
- [ ] MongoDB running and accessible
- [ ] Backend starts without errors
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] AI models downloaded successfully

**Frontend:**
- [ ] Node.js 14+ and npm installed
- [ ] Dependencies installed successfully
- [ ] `.env` file created
- [ ] Frontend starts without errors
- [ ] Accessible at http://localhost:3000
- [ ] No console errors in browser

**Integration:**
- [ ] Can register new user
- [ ] Can login successfully
- [ ] Can analyze single message
- [ ] Can import bulk chat
- [ ] Dashboard displays data
- [ ] Can generate PDF reports
- [ ] Can view recommendations

---

**Status:** ✅ Complete Setup Guide
**Last Updated:** November 7, 2025
**Version:** 1.0
