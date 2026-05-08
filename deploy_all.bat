@echo off
echo ============================================
echo  TaskFlow - Deploying Backend to Cloud Run
echo ============================================
cd /d "%~dp0backend"
call gcloud run deploy taskflow-backend --source=. --region=us-central1 --allow-unauthenticated --port=8080 --project=gen-ai-poc-onboarding --env-vars-file=env.yaml --memory=512Mi
if %ERRORLEVEL% NEQ 0 (
    echo Backend deployment failed!
    exit /b 1
)

echo.
echo ============================================
echo  TaskFlow - Deploying Frontend to Cloud Run
echo ============================================
cd /d "%~dp0frontend"
call gcloud run deploy taskflow-frontend --source=. --region=us-central1 --allow-unauthenticated --port=8080 --project=gen-ai-poc-onboarding
if %ERRORLEVEL% NEQ 0 (
    echo Frontend deployment failed!
    exit /b 1
)

echo.
echo ============================================
echo  TaskFlow - Both deployments completed!
echo ============================================
