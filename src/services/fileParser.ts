import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ProductData {
  id: string;
  name: string;
  category1: string;
  category2: string;
  shopName: string;
  agency?: string;
  imageLink?: string;
  imageLinks?: string[];
  [key: string]: any;
}

export async function parseFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    } else if (extension === 'xls' || extension === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
          resolve(json);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('不支持的文件格式。请上传 Excel 或 CSV 文件。'));
    }
  });
}

// Maps Chinese headers or common English headers to a standard format
export function standardizeData(data: any[]): ProductData[] {
  return data.map(row => {
    // Try to find the image link column by checking variations
    const imageLinkKey = Object.keys(row).find(key => 
      key.toLowerCase().includes('图片') || 
      key.toLowerCase().includes('image') || 
      key.toLowerCase().includes('picture') ||
      key.toLowerCase().includes('链接') ||
      key.toLowerCase().includes('url') ||
      key.includes('链接图片')
    );
    
    const idKey = Object.keys(row).find(key => key.toLowerCase().includes('id') || key.toLowerCase().includes('编号'));
    const nameKey = Object.keys(row).find(key => (key.toLowerCase().includes('name') || key.includes('名称')) && !key.toLowerCase().includes('category') && !key.toLowerCase().includes('shop'));
    const cat1Key = Object.keys(row).find(key => key.toLowerCase().includes('first') || key.toLowerCase().includes('1') || key.includes('一级'));
    const cat2Key = Object.keys(row).find(key => key.toLowerCase().includes('second') || key.toLowerCase().includes('2') || key.includes('二级'));
    const shopKey = Object.keys(row).find(key => key.toLowerCase().includes('shop') || key.includes('店铺'));
    const agencyKey = Object.keys(row).find(key => key.includes('机构') || key.toLowerCase().includes('agency'));

    // Handle potential numeric precision issues for long IDs
    const rawId = idKey ? row[idKey] : (row['Product id'] || row['Product ID'] || row['product id'] || '');
    const id = String(rawId).trim();

    const imageStr = imageLinkKey ? row[imageLinkKey] : (row['链接图片'] || row['Image'] || row['图片'] || '');
    let imageLinks: string[] = [];
    if (typeof imageStr === 'string' && imageStr.trim().length > 0) {
      const matches = imageStr.match(/(https?:\/\/[^\s,;|]+)/gi);
      if (matches) {
        imageLinks = matches;
      } else {
        imageLinks = [imageStr];
      }
    }

    return {
      id: id,
      name: nameKey ? row[nameKey] : (row['Product name'] || row['Product Name'] || row['product name'] || ''),
      category1: cat1Key ? row[cat1Key] : (row['First-level category name'] || row['first level'] || ''),
      category2: cat2Key ? row[cat2Key] : (row['second-level category name'] || row['second level'] || ''),
      shopName: shopKey ? row[shopKey] : (row['shop_name'] || row['Shop Name'] || ''),
      agency: agencyKey ? row[agencyKey] : (row['过往带货可能有样机构'] || ''),
      imageLink: imageStr,
      imageLinks: imageLinks,
      _original: row
    };
  });
}
