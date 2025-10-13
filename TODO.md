# TODO: Fix CORS Error in Crop Recommendation

## Steps to Complete

- [x] Remove explicit OPTIONS handling from /api/crop/predict endpoint in backend/app.py
- [x] Remove explicit OPTIONS handling from /api/fertilizer/predict endpoint in backend/app.py
- [x] Fix model path in backend/app.py to point to the correct nested directory
- [x] Fix crop type mapping to match frontend ("Sugar Cane" instead of "Sugarcane")
- [x] Redeploy the backend on Render
- [ ] Test the frontend request to ensure CORS is resolved
