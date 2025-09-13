'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Share2, Download, Copy, Check } from 'lucide-react';

interface PollQRCodeProps {
  pollId: string;
}

export default function PollQRCode({ pollId }: PollQRCodeProps) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Generate the full URL for the poll
  const pollUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/polls/${pollId}`
    : `/polls/${pollId}`;

  // Handle copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Handle QR code download
  const downloadQRCode = () => {
    const svg = document.getElementById('poll-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      // Download the PNG file
      const downloadLink = document.createElement('a');
      downloadLink.download = `poll-${pollId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="mt-4">
      <Button 
        variant="outline" 
        onClick={() => setShowQR(!showQR)}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        {showQR ? 'Hide Sharing Options' : 'Share Poll'}
      </Button>
      
      {showQR && (
        <Card className="mt-4 p-4">
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-medium mb-4">Share this poll</h3>
            
            <div className="mb-4">
              <QRCodeSVG 
                id="poll-qr-code"
                value={pollUrl} 
                size={200} 
                bgColor={"#ffffff"} 
                fgColor={"#000000"} 
                level={"L"} 
                includeMargin={false} 
              />
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" onClick={downloadQRCode}>
                <Download className="h-4 w-4 mr-2" />
                Download QR
              </Button>
              
              <Button variant="outline" onClick={copyToClipboard}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              Anyone with this link can view and vote on this poll
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}