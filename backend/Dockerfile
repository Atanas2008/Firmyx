FROM python:3.11-slim
WORKDIR /app

# Copy requirements first — Docker caches this layer until requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source after dependencies so code edits don't invalidate the pip layer
COPY . .
RUN mkdir -p uploads reports
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
