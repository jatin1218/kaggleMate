import { ColumnInfo, DatasetSummary, ColumnStats } from '../types';

export const parseCSV = async (file: File): Promise<DatasetSummary> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        
        // 1. Validation: Character Encoding Check
        // Check for the Replacement Character () which indicates decoding errors
        if (text.includes('\uFFFD')) {
          throw new Error("Encoding Error: The file contains invalid characters. Please ensure the CSV is UTF-8 encoded.");
        }

        const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
        
        if (lines.length < 2) {
          throw new Error("File is empty or contains insufficient data (less than 2 rows).");
        }

        // 2. Detection: Smart Delimiter Detection
        const firstLine = lines[0];
        const possibleDelimiters = [',', ';', '\t', '|'];
        let bestDelimiter = ',';
        let maxCount = 0;

        possibleDelimiters.forEach(d => {
          const count = firstLine.split(d).length - 1;
          if (count > maxCount) {
            maxCount = count;
            bestDelimiter = d;
          }
        });

        // 3. Helper: Robust Splitter (handles quoted delimiters)
        // Escapes the delimiter for regex usage
        const escapedDelim = bestDelimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
        const splitRegex = new RegExp(`${escapedDelim}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
        
        const splitLine = (line: string): string[] => {
          return line.split(splitRegex).map(v => v.trim().replace(/^"|"$/g, ''));
        };

        // Get headers
        const headers = splitLine(firstLine);
        const expectedColumnCount = headers.length;

        if (expectedColumnCount < 1) {
          throw new Error("Could not detect columns. Please check delimiters.");
        }

        // 4. Validation: Structural Integrity Check
        // Scan a sample of rows to ensure they match the header count
        const validationLimit = Math.min(lines.length, 100); 
        let malformedCount = 0;

        for (let i = 1; i < validationLimit; i++) {
           const rowCols = splitLine(lines[i]);
           if (rowCols.length !== expectedColumnCount) {
             malformedCount++;
           }
        }

        if (malformedCount > (validationLimit * 0.2)) {
           throw new Error(`Data Integrity Error: ${malformedCount} out of first ${validationLimit} rows have inconsistent column counts. Expected ${expectedColumnCount} columns. This is often caused by unquoted commas within text fields or mixed delimiters.`);
        }

        // --- Standard Processing Continues ---

        const previewLines = lines.slice(1, 51); // Limit to top 50 for preview
        const dataLines = lines.slice(1);
        
        // Basic parsing for preview
        const preview = previewLines.map(line => {
          const values = splitLine(line);
          const row: any = {};
          headers.forEach((h, i) => {
            row[h] = values[i];
          });
          return row;
        });

        // Column Analysis & Stats Collection
        const sampleLimit = Math.min(dataLines.length, 2000); 
        const columnValues: Record<number, string[]> = {};

        // Collect raw values for sample
        for (let i = 0; i < sampleLimit; i++) {
          const line = dataLines[i];
          const rowValues = splitLine(line);
          
          headers.forEach((_, index) => {
            const val = rowValues[index];
            if (val !== undefined && val !== '') {
              if (!columnValues[index]) columnValues[index] = [];
              columnValues[index].push(val);
            }
          });
        }

        const columns: ColumnInfo[] = headers.map((header, index) => {
          const rawValues = columnValues[index] || [];
          const missingCount = sampleLimit - rawValues.length;
          const distinct = new Set(rawValues);
          
          // Determine Type
          let numericCount = 0;
          let dateCount = 0;
          const numericParsed: number[] = [];
          const dateParsed: number[] = [];
          
          rawValues.forEach(v => {
            // Check Numeric
            const n = Number(v);
            if (!isNaN(n) && v !== '') {
              numericCount++;
              numericParsed.push(n);
            }
            
            // Check Date (basic check: must have some length and parseable)
            if (v.length > 5 && !(!isNaN(Number(v)))) {
              const d = Date.parse(v);
              if (!isNaN(d)) {
                dateCount++;
                dateParsed.push(d);
              }
            }
          });

          const isNumeric = rawValues.length > 0 && (numericCount / rawValues.length) > 0.8;
          const isDate = !isNumeric && rawValues.length > 0 && (dateCount / rawValues.length) > 0.6;
          
          const type = isNumeric ? 'numeric' : isDate ? 'date' : 'string';
          
          // Generate Stats for Graphing
          let stats: ColumnStats = {};

          if (isNumeric) {
            const min = Math.min(...numericParsed);
            const max = Math.max(...numericParsed);
            const mean = numericParsed.reduce((a, b) => a + b, 0) / numericParsed.length;
            
            // Sort for quantiles
            numericParsed.sort((a, b) => a - b);
            const q1 = numericParsed[Math.floor(numericParsed.length * 0.25)];
            const median = numericParsed[Math.floor(numericParsed.length * 0.5)];
            const q3 = numericParsed[Math.floor(numericParsed.length * 0.75)];

            // Simple Histogram (10 bins)
            const binCount = 10;
            const step = (max - min) / binCount;
            const histogram: { name: string; value: number }[] = [];
            
            if (step > 0) {
              for (let i = 0; i < binCount; i++) {
                const rangeStart = min + (i * step);
                const rangeEnd = min + ((i + 1) * step);
                const count = numericParsed.filter(n => n >= rangeStart && (i === binCount - 1 ? n <= rangeEnd : n < rangeEnd)).length;
                histogram.push({
                  name: `${rangeStart.toFixed(1)}`, // Short label for X-axis
                  value: count
                });
              }
            } else {
               histogram.push({ name: min.toString(), value: numericParsed.length });
            }
            stats = { min, max, mean, histogram, quantiles: { q1, median, q3 } };

          } else if (isDate) {
            const min = Math.min(...dateParsed);
            const max = Math.max(...dateParsed);
            
            // Histogram by time buckets (10 bins)
            const binCount = 10;
            const step = (max - min) / binCount;
            const histogram: { name: string; value: number }[] = [];
            
            if (step > 0) {
              for (let i = 0; i < binCount; i++) {
                const rangeStart = min + (i * step);
                const rangeEnd = min + ((i + 1) * step);
                const count = dateParsed.filter(n => n >= rangeStart && (i === binCount - 1 ? n <= rangeEnd : n < rangeEnd)).length;
                // Format date label
                const dateLabel = new Date(rangeStart).toISOString().split('T')[0];
                histogram.push({
                  name: dateLabel,
                  value: count
                });
              }
            } else {
               histogram.push({ name: new Date(min).toISOString().split('T')[0], value: dateParsed.length });
            }
             stats = { min, max, histogram };

          } else {
            // Frequency Count for Top Categories
            const counts: Record<string, number> = {};
            rawValues.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
            
            const topValues = Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 20) // Top 20 for word cloud
              .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value }));
            
            stats = { topValues };
          }

          return {
            name: header,
            type,
            missing: missingCount, // specific to sample
            unique: distinct.size,
            example: rawValues[0] || null,
            stats
          };
        });

        resolve({
          rowCount: dataLines.length,
          columns,
          preview,
          fileName: file.name
        });

      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file); 
  });
};