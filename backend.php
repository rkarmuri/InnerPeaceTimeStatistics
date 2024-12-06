<?php
// Configuration
define('UPLOAD_FOLDER', __DIR__ . '/uploads');
define('PROCESSED_FOLDER', __DIR__ . '/processed');

// Ensure directories exist
if (!file_exists(UPLOAD_FOLDER)) {
    mkdir(UPLOAD_FOLDER, 0777, true);
}
if (!file_exists(PROCESSED_FOLDER)) {
    mkdir(PROCESSED_FOLDER, 0777, true);
}

// Handle requests
$action = $_GET['action'] ?? null;
switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        if ($action === 'upload') {
            handleFileUpload();
        }
        break;

    case 'GET':
        if ($action === 'list_uploaded') {
            listFiles(UPLOAD_FOLDER);
        } elseif ($action === 'list_processed') {
            listFiles(PROCESSED_FOLDER);
        } elseif ($action === 'download_uploaded') {
            downloadFile(UPLOAD_FOLDER, $_GET['filename'] ?? '');
        } elseif ($action === 'download_processed') {
            downloadFile(PROCESSED_FOLDER, $_GET['filename'] ?? '');
        }
        break;

    case 'DELETE':
        if ($action === 'delete_uploaded') {
            deleteFile(UPLOAD_FOLDER, $_GET['filename'] ?? '');
        } elseif ($action === 'delete_processed') {
            deleteFile(PROCESSED_FOLDER, $_GET['filename'] ?? '');
        }
        break;

    default:
        sendJsonResponse(['error' => 'Invalid request'], 400);
        break;
}

// Functions

function handleFileUpload()
{
    if (!isset($_FILES['file']) || !isset($_POST['section'])) {
        sendJsonResponse(['error' => 'File or section missing'], 400);
        return;
    }

    $section = $_POST['section'];
    $uploadedFiles = $_FILES['file'];
    $response = [];

    foreach ($uploadedFiles['tmp_name'] as $index => $tmpName) {
        $originalName = $uploadedFiles['name'][$index];
        $uploadPath = UPLOAD_FOLDER . '/' . $originalName;

        if (move_uploaded_file($tmpName, $uploadPath)) {
            $processedFile = processCsv($uploadPath, $section);
            $response[] = [
                'original_file' => $originalName,
                'processed_file' => basename($processedFile)
            ];
        }
    }

    sendJsonResponse(['status' => 'success', 'files' => $response]);
}

function listFiles($folder)
{
    $files = array_diff(scandir($folder), ['.', '..']);
    $fileDetails = [];

    foreach ($files as $file) {
        $filePath = $folder . '/' . $file;
        $fileDetails[] = [
            'name' => $file,
            'size' => filesize($filePath)
        ];
    }

    sendJsonResponse($fileDetails);
}

function downloadFile($folder, $filename)
{
    $filePath = $folder . '/' . $filename;

    if (file_exists($filePath)) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . basename($filePath) . '"');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;
    } else {
        sendJsonResponse(['error' => 'File not found'], 404);
    }
}

function deleteFile($folder, $filename)
{
    $filePath = $folder . '/' . $filename;

    if (file_exists($filePath)) {
        unlink($filePath);
        sendJsonResponse(['message' => 'File deleted successfully']);
    } else {
        sendJsonResponse(['error' => 'File not found'], 404);
    }
}

function processCsv($csvFilePath, $section)
{
    // Video details
    $videoDetails = [
        'view-video' => [
            '/videos/21' => ['title' => 'Welcome to Inner Peace Time', 'duration' => '1:15'],
            '/videos/83' => ['title' => 'Getting Started Guide', 'duration' => '2:40'],
            '/videos/87' => ['title' => 'Meditation Tips', 'duration' => '2:13'],
            '/videos/23' => ['title' => 'Breathe Like Navy Seals', 'duration' => '6:41'],
            '/videos/25' => ['title' => 'Heart Coherence', 'duration' => '5:09'],
            '/videos/29' => ['title' => 'Stress Buster', 'duration' => '10:01'],
            '/videos/140' => ['title' => 'I am Safe', 'duration' => '9:26'],
            '/videos/31' => ['title' => 'Embrace Love. Release Fear', 'duration' => '9:58'],
            '/videos/27' => ['title' => 'Blissful Sleep', 'duration' => '17:02'],
            '/videos/72' => ['title' => 'Relax Your Body', 'duration' => '7:09'],
            '/videos/36' => ['title' => 'Morning Light', 'duration' => '6:05'],
            '/videos/33' => ['title' => 'Energy Booster', 'duration' => '6:29'],
            '/videos/147' => ['title' => 'Boost Love and Healing', 'duration' => '9:20'],
            '/videos/38' => ['title' => 'Peace Breath Introduction', 'duration' => '6:09'],
            '/videos/67' => ['title' => 'Peace Breath 10-minute Version', 'duration' => '10:02'],
            '/videos/70' => ['title' => 'Body Scan', 'duration' => '8:28'],
            '/videos/218' => ['title' => 'Renew Your Day', 'duration' => '06:10'],
            '/videos/222' => ['title' => 'Gratitude for You', 'duration' => '05:15']
        ]
    ];

    // Read CSV
    $rows = [];
    if (($handle = fopen($csvFilePath, 'r')) !== false) {
        $header = fgetcsv($handle); // Get header row
        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = array_combine($header, $row);
        }
        fclose($handle);
    } else {
        return null;
    }

    // Process based on the section
    if ($section == '1') {
        $rows = array_slice($rows, 1); // Drop the first row
    } elseif ($section == '2') {
        $rows = array_filter($rows, function ($row) {
            return preg_match('/^[123]/', $row['User Login'] ?? '');
        });
    } else {
        return null; // Invalid section
    }

    // Prepare new data
    $finalRecords = [];
    foreach ($rows as $row) {
        $actions = explode('|', $row['Activity_action']);
        $dates = explode('|', $row['Activity_action-date']);
        $values = explode('|', $row['Activity_action-value']);

        foreach ($actions as $index => $action) {
            $newRow = [
                'User Login' => $row['User Login'],
                'Action' => $action,
                'Date' => $dates[$index] ?? null,
                'Value' => $values[$index] ?? null
            ];

            // Add video details
            $video = $videoDetails[$action][$newRow['Value']] ?? null;
            $newRow['video_title'] = $video['title'] ?? null;
            $newRow['video_duration'] = $video['duration'] ?? null;

            $finalRecords[] = $newRow;
        }
    }

    // Write processed CSV with a filename
    $timestamp = new DateTime('now', new DateTimeZone('America/Chicago'));
    $outputPath = PROCESSED_FOLDER . "/data_{$timestamp->format('Ymd_His')}.csv";
    if (($handle = fopen($outputPath, 'w+')) !== false) {
        // Write header row
        fputcsv($handle, array_keys($finalRecords[0])); // Add headers
        foreach ($finalRecords as $record) {
            fputcsv($handle, $record);
        }
        fclose($handle);

        return $outputPath;
    } else {
        return null;
    }
}

function sendJsonResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
?>
