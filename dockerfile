FROM python:3.10-slim

WORKDIR /app

# Copy dependency definition list first to take advantage of Docker caching speeds
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your app application directory workspace files
COPY . .

# Expose the mandatory Hugging Face port container layout
EXPOSE 7860

# Launch Uvicorn pointing explicitly to Hugging Face's required port allocation
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
