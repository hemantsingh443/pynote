import { useMemo } from 'react';
import type { CellOutput } from '../store/notebookStore';

interface OutputPanelProps {
  output?: CellOutput | CellOutput[];
}

// Helper function to detect if a string is a CSV or TSV
export function isTabularData(text: string): boolean {
  // Check for CSV/TSV patterns
  const lines = text.trim().split('\n');
  if (lines.length < 2) return false;
  
  // Check if first line looks like headers
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const headerCount = firstLine.split(delimiter).length;
  
  // Check if subsequent lines have the same number of columns
  return lines.slice(1, Math.min(5, lines.length)).every(line => {
    return line.trim().split(delimiter).length === headerCount;
  });
}

// Component to render tabular data
export function TableView({ data }: { data: string }) {
  const lines = data.trim().split('\n');
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter);
  const rows = lines.slice(1).filter(Boolean);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow-sm border border-border rounded-lg">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-secondary">
              <tr>
                {headers.map((header, i) => (
                  <th 
                    key={i}
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase tracking-wider"
                  >
                    {header.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {rows.map((row, rowIndex) => {
                const cells = row.split(delimiter);
                return (
                  <tr key={rowIndex} className="hover:bg-surface-hover">
                    {cells.map((cell, cellIndex) => (
                      <td 
                        key={`${rowIndex}-${cellIndex}`}
                        className="px-3 py-2 text-sm text-foreground whitespace-nowrap"
                      >
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Component to render a single output
function SingleOutput({ output }: { output: CellOutput }) {
  const renderOutput = useMemo(() => {
    switch (output.type) {
      case 'image':
        return (
          <div className="bg-surface-secondary p-2 rounded border border-border">
            <img 
              src={`data:image/png;base64,${output.data}`} 
              alt="Output plot" 
              className="max-w-full h-auto mx-auto"
            />
          </div>
        );
      
      case 'html':
        return (
          <div 
            className="p-2 bg-surface-secondary rounded border border-border overflow-auto" 
            dangerouslySetInnerHTML={{ __html: output.data }}
          />
        );
      
      case 'error':
        return (
          <div className="bg-error/10 border-l-4 border-error p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-error" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-error">
                  {output.data}
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'string':
      default:
        // Check if the output looks like tabular data
        if (isTabularData(output.data)) {
          return <TableView data={output.data} />;
        }
        
        // For regular text output
        return (
          <pre className="whitespace-pre-wrap font-mono text-sm p-3 bg-surface rounded border border-border overflow-auto text-foreground">
            {output.data}
          </pre>
        );
    }
  }, [output]);

  return (
    <div className="mb-2 last:mb-0">
      {renderOutput}
    </div>
  );
}

export default function OutputPanel({ output }: OutputPanelProps) {
  if (!output) return null;

  // Handle array of outputs
  if (Array.isArray(output)) {
    return (
      <div className="mt-1 space-y-2">
        {output.map((singleOutput, index) => (
          <SingleOutput key={index} output={singleOutput} />
        ))}
      </div>
    );
  }

  // Handle single output
  return (
    <div className="mt-1">
      <SingleOutput output={output} />
    </div>
  );
}