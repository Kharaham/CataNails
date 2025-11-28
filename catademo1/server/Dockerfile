FROM python:3.10-slim

# Install system dependencies including git
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
