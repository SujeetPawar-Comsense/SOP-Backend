@echo off
echo Fixing NumPy compatibility issue...
echo.
cd /d "%~dp0\src\rag"
echo Uninstalling current NumPy...
pip uninstall numpy -y
echo.
echo Installing compatible NumPy version...
pip install numpy==1.26.4
echo.
echo Reinstalling packages that depend on NumPy...
pip install --upgrade --force-reinstall scikit-learn sentence-transformers
echo.
echo Done! Now restart the RAG service.
pause
