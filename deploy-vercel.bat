@echo off
echo ========================================
echo TRK Project - Vercel Deployment Script
echo ========================================
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Vercel CLI not found!
    echo.
    echo Installing Vercel CLI globally...
    call npm install -g vercel
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install Vercel CLI
        pause
        exit /b 1
    )
    echo [SUCCESS] Vercel CLI installed!
    echo.
)

echo [INFO] Vercel CLI is ready
echo.

REM Login to Vercel
echo Step 1: Login to Vercel
echo ------------------------
vercel login
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Vercel login failed
    pause
    exit /b 1
)
echo.

REM Run production build locally first
echo Step 2: Building project locally...
echo -----------------------------------
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed! Please fix errors before deploying.
    pause
    exit /b 1
)
echo [SUCCESS] Build completed successfully!
echo.

REM Deploy to Vercel
echo Step 3: Deploying to Vercel...
echo -------------------------------
echo.
echo Choose deployment type:
echo 1. Preview Deployment (for testing)
echo 2. Production Deployment
echo.
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Deploying to Preview...
    vercel
) else if "%choice%"=="2" (
    echo.
    echo Deploying to Production...
    vercel --prod
) else (
    echo [ERROR] Invalid choice. Exiting.
    pause
    exit /b 1
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Deployment failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo [SUCCESS] Deployment completed!
echo ========================================
echo.
echo Next steps:
echo 1. Configure environment variables in Vercel Dashboard
echo 2. Update Google OAuth redirect URIs
echo 3. Test your deployed application
echo 4. Monitor logs in Vercel Dashboard
echo.
pause
