# MIRA - Автоматическая загрузка при изменении файлов
# Запускается в фоновом режиме и отслеживает изменения

$watchPath = "d:\! Погода\MIRA 0.1.4.3"
$filter = "*.*"
$gitRepo = "https://github.com/kkav45/mira0143.git"
$branch = "main"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIRA - Автозагрузка на GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Путь: $watchPath" -ForegroundColor Yellow
Write-Host "Репозиторий: $gitRepo" -ForegroundColor Yellow
Write-Host ""
Write-Host "[INFO] Мониторинг изменений HTML файлов..." -ForegroundColor Green
Write-Host "[INFO] Для остановки нажмите Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Создаём FileSystemWatcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $watchPath
$watcher.Filter = $filter
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Флаг для предотвращения множественных срабатываний
$script:isUploading = $false
$script:pendingChanges = $false

# Функция загрузки
function Upload-ToGitHub {
    if ($script:isUploading) {
        $script:pendingChanges = $true
        return
    }
    
    $script:isUploading = $true
    
    Write-Host ""
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Обнаружены изменения!" -ForegroundColor Cyan
    
    # Переход в директорию
    Push-Location $watchPath
    
    # Проверка Git
    if (-not (Test-Path ".git")) {
        Write-Host "[ERROR] Git репозиторий не найден! Запустите setup-git.bat" -ForegroundColor Red
        Pop-Location
        $script:isUploading = $false
        return
    }
    
    # Добавление изменений
    Write-Host "[1/4] Добавление файлов..." -ForegroundColor Gray
    git add . 2>&1 | Out-Null
    
    # Проверка есть ли изменения для коммита
    $status = git status --porcelain
    if (-not $status) {
        Write-Host "[INFO] Нет изменений для загрузки" -ForegroundColor Gray
        Pop-Location
        $script:isUploading = $false
        return
    }
    
    # Коммит
    Write-Host "[2/4] Создание коммита..." -ForegroundColor Gray
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Auto-update: $timestamp" 2>&1 | Out-Null
    
    # Пуш
    Write-Host "[3/4] Загрузка на GitHub..." -ForegroundColor Gray
    $pushResult = git push -u origin $branch 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[4/4] Успешно загружено!" -ForegroundColor Green
        Write-Host "      https://github.com/kkav45/mira0141" -ForegroundColor Gray
    } else {
        Write-Host "[ERROR] Ошибка загрузки: $pushResult" -ForegroundColor Red
    }
    
    Pop-Location
    $script:isUploading = $false
    
    # Если есть ожидающие изменения, загружаем снова
    if ($script:pendingChanges) {
        $script:pendingChanges = $false
        Start-Sleep -Seconds 2
        Upload-ToGitHub
    }
}

# Регистрация событий
$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    
    # Игнорируем временные файлы и служебные
    if ($path -match "~\$" -or $path -match "\.tmp" -or $path -match "\.git" -or $path -match "node_modules") {
        return
    }
    
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Изменение: $changeType" -ForegroundColor DarkGray
    
    # Небольшая задержка перед загрузкой (ждем завершения записи файла)
    Start-Sleep -Seconds 1
    Upload-ToGitHub
}

# Подписка на события
Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action $action -SourceIdentifier "FileChanged"
Register-ObjectEvent -InputObject $watcher -EventName "Created" -Action $action -SourceIdentifier "FileCreated"
Register-ObjectEvent -InputObject $watcher -EventName "Renamed" -Action $action -SourceIdentifier "FileRenamed"
Register-ObjectEvent -InputObject $watcher -EventName "Deleted" -Action $action -SourceIdentifier "FileDeleted"

# Основной цикл
try {
    while ($true) {
        Start-Sleep -Milliseconds 500
    }
}
catch {
    Write-Host ""
    Write-Host "[INFO] Остановка мониторинга..." -ForegroundColor Yellow
    $watcher.EnableRaisingEvents = $false
    Unregister-Event -SourceIdentifier "FileChanged"
    Unregister-Event -SourceIdentifier "FileCreated"
    Unregister-Event -SourceIdentifier "FileRenamed"
    Unregister-Event -SourceIdentifier "FileDeleted"
    Write-Host "[INFO] Мониторинг остановлен" -ForegroundColor Gray
}
