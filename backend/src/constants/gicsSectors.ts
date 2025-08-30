/**
 * GICS (Global Industry Classification Standard) Sectors and Industries
 * This file contains the complete GICS taxonomy for sector classification
 */

export interface GICSSector {
  code: string
  name: string
  description: string
  industryGroups: GICSIndustryGroup[]
}

export interface GICSIndustryGroup {
  code: string
  name: string
  industries: GICSIndustry[]
}

export interface GICSIndustry {
  code: string
  name: string
  subIndustries: GICSSubIndustry[]
}

export interface GICSSubIndustry {
  code: string
  name: string
  keywords: string[]
}

export interface SectorMapping {
  ticker: string
  sector: string
  industryGroup?: string
  industry?: string
  subIndustry?: string
  source: 'MANUAL' | 'AUTO' | 'YAHOO' | 'EXTERNAL'
  confidence: number
}

// GICS Level 1 - Sectors (11 sectors)
export const GICS_SECTORS: GICSSector[] = [
  {
    code: '10',
    name: 'Energy',
    description: 'Companies in the energy sector are engaged in exploration, production, marketing, refining, and/or transportation of oil and gas products, coal, and renewable energy.',
    industryGroups: [
      {
        code: '1010',
        name: 'Energy',
        industries: [
          {
            code: '101010',
            name: 'Energy Equipment & Services',
            subIndustries: [
              { code: '10101010', name: 'Oil & Gas Drilling', keywords: ['drilling', 'oilfield', 'oil services', 'exploration'] },
              { code: '10101020', name: 'Oil & Gas Equipment & Services', keywords: ['oil equipment', 'gas equipment', 'energy services'] }
            ]
          },
          {
            code: '101020',
            name: 'Oil, Gas & Consumable Fuels',
            subIndustries: [
              { code: '10102010', name: 'Integrated Oil & Gas', keywords: ['exxon', 'chevron', 'bp', 'shell', 'total'] },
              { code: '10102020', name: 'Oil & Gas Exploration & Production', keywords: ['exploration', 'production', 'upstream'] },
              { code: '10102030', name: 'Oil & Gas Refining & Marketing', keywords: ['refining', 'marketing', 'downstream'] },
              { code: '10102040', name: 'Oil & Gas Storage & Transportation', keywords: ['pipeline', 'storage', 'transportation'] },
              { code: '10102050', name: 'Coal & Consumable Fuels', keywords: ['coal', 'consumable fuels'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '15',
    name: 'Materials',
    description: 'Companies in the materials sector are engaged in the discovery, development, and processing of raw materials.',
    industryGroups: [
      {
        code: '1510',
        name: 'Materials',
        industries: [
          {
            code: '151010',
            name: 'Chemicals',
            subIndustries: [
              { code: '15101010', name: 'Commodity Chemicals', keywords: ['commodity chemicals', 'basic chemicals'] },
              { code: '15101020', name: 'Diversified Chemicals', keywords: ['diversified chemicals', 'specialty chemicals'] },
              { code: '15101030', name: 'Fertilizers & Agricultural Chemicals', keywords: ['fertilizers', 'agricultural', 'agrochemicals'] },
              { code: '15101040', name: 'Industrial Gases', keywords: ['industrial gases', 'oxygen', 'nitrogen'] },
              { code: '15101050', name: 'Specialty Chemicals', keywords: ['specialty chemicals', 'fine chemicals'] }
            ]
          },
          {
            code: '151020',
            name: 'Construction Materials',
            subIndustries: [
              { code: '15102010', name: 'Construction Materials', keywords: ['construction materials', 'cement', 'concrete'] }
            ]
          },
          {
            code: '151030',
            name: 'Containers & Packaging',
            subIndustries: [
              { code: '15103010', name: 'Metal & Glass Containers', keywords: ['metal containers', 'glass containers'] },
              { code: '15103020', name: 'Paper Packaging', keywords: ['paper packaging', 'cardboard'] }
            ]
          },
          {
            code: '151040',
            name: 'Metals & Mining',
            subIndustries: [
              { code: '15104010', name: 'Aluminum', keywords: ['aluminum', 'aluminium', 'bauxite'] },
              { code: '15104020', name: 'Copper', keywords: ['copper', 'copper mining'] },
              { code: '15104025', name: 'Diversified Metals & Mining', keywords: ['diversified metals', 'mining'] },
              { code: '15104030', name: 'Gold', keywords: ['gold', 'gold mining'] },
              { code: '15104040', name: 'Precious Metals & Minerals', keywords: ['precious metals', 'silver', 'platinum'] },
              { code: '15104045', name: 'Silver', keywords: ['silver', 'silver mining'] },
              { code: '15104050', name: 'Steel', keywords: ['steel', 'iron ore', 'steel production'] }
            ]
          },
          {
            code: '151050',
            name: 'Paper & Forest Products',
            subIndustries: [
              { code: '15105010', name: 'Forest Products', keywords: ['forest products', 'lumber', 'wood'] },
              { code: '15105020', name: 'Paper Products', keywords: ['paper products', 'pulp'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '20',
    name: 'Industrials',
    description: 'Companies in the industrials sector are engaged in the manufacturing and distribution of capital goods.',
    industryGroups: [
      {
        code: '2010',
        name: 'Capital Goods',
        industries: [
          {
            code: '201010',
            name: 'Aerospace & Defense',
            subIndustries: [
              { code: '20101010', name: 'Aerospace & Defense', keywords: ['aerospace', 'defense', 'boeing', 'airbus', 'lockheed'] }
            ]
          },
          {
            code: '201020',
            name: 'Building Products',
            subIndustries: [
              { code: '20102010', name: 'Building Products', keywords: ['building products', 'construction equipment'] }
            ]
          },
          {
            code: '201030',
            name: 'Construction & Engineering',
            subIndustries: [
              { code: '20103010', name: 'Construction & Engineering', keywords: ['construction', 'engineering', 'infrastructure'] }
            ]
          },
          {
            code: '201040',
            name: 'Electrical Equipment',
            subIndustries: [
              { code: '20104010', name: 'Electrical Components & Equipment', keywords: ['electrical equipment', 'electrical components'] },
              { code: '20104020', name: 'Heavy Electrical Equipment', keywords: ['heavy electrical', 'power equipment'] }
            ]
          },
          {
            code: '201050',
            name: 'Industrial Conglomerates',
            subIndustries: [
              { code: '20105010', name: 'Industrial Conglomerates', keywords: ['industrial conglomerates', 'ge', 'siemens', '3m'] }
            ]
          },
          {
            code: '201060',
            name: 'Machinery',
            subIndustries: [
              { code: '20106010', name: 'Construction & Farm Machinery & Heavy Trucks', keywords: ['construction machinery', 'farm machinery', 'caterpillar', 'deere'] },
              { code: '20106015', name: 'Industrial Machinery', keywords: ['industrial machinery', 'manufacturing equipment'] },
              { code: '20106020', name: 'Trading Companies & Distributors', keywords: ['trading companies', 'distributors'] }
            ]
          }
        ]
      },
      {
        code: '2020',
        name: 'Commercial & Professional Services',
        industries: [
          {
            code: '202010',
            name: 'Commercial Services & Supplies',
            subIndustries: [
              { code: '20201010', name: 'Commercial Printing', keywords: ['commercial printing', 'printing services'] },
              { code: '20201050', name: 'Environmental & Facilities Services', keywords: ['environmental services', 'facilities services', 'waste management'] },
              { code: '20201060', name: 'Office Services & Supplies', keywords: ['office services', 'office supplies'] },
              { code: '20201070', name: 'Diversified Support Services', keywords: ['support services', 'business services'] },
              { code: '20201080', name: 'Security & Alarm Services', keywords: ['security services', 'alarm services'] }
            ]
          },
          {
            code: '202020',
            name: 'Professional Services',
            subIndustries: [
              { code: '20202010', name: 'Human Resource & Employment Services', keywords: ['hr services', 'employment services', 'staffing'] },
              { code: '20202020', name: 'Research & Consulting Services', keywords: ['consulting', 'research services'] }
            ]
          }
        ]
      },
      {
        code: '2030',
        name: 'Transportation',
        industries: [
          {
            code: '203010',
            name: 'Air Freight & Logistics',
            subIndustries: [
              { code: '20301010', name: 'Air Freight & Logistics', keywords: ['air freight', 'logistics', 'fedex', 'ups'] }
            ]
          },
          {
            code: '203020',
            name: 'Airlines',
            subIndustries: [
              { code: '20302010', name: 'Airlines', keywords: ['airlines', 'american airlines', 'delta', 'united'] }
            ]
          },
          {
            code: '203030',
            name: 'Marine',
            subIndustries: [
              { code: '20303010', name: 'Marine', keywords: ['marine', 'shipping', 'maritime'] }
            ]
          },
          {
            code: '203040',
            name: 'Road & Rail',
            subIndustries: [
              { code: '20304010', name: 'Railroads', keywords: ['railroads', 'railway', 'trains'] },
              { code: '20304020', name: 'Trucking', keywords: ['trucking', 'freight'] }
            ]
          },
          {
            code: '203050',
            name: 'Transportation Infrastructure',
            subIndustries: [
              { code: '20305010', name: 'Airport Services', keywords: ['airport services', 'airports'] },
              { code: '20305020', name: 'Highways & Railtracks', keywords: ['highways', 'railtracks', 'toll roads'] },
              { code: '20305030', name: 'Marine Ports & Services', keywords: ['ports', 'marine services'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '25',
    name: 'Consumer Discretionary',
    description: 'Companies in the consumer discretionary sector manufacture and sell consumer goods and services that people buy at their discretion.',
    industryGroups: [
      {
        code: '2510',
        name: 'Automobiles & Components',
        industries: [
          {
            code: '251010',
            name: 'Auto Components',
            subIndustries: [
              { code: '25101010', name: 'Auto Components', keywords: ['auto components', 'automotive parts'] },
              { code: '25101020', name: 'Tires & Rubber', keywords: ['tires', 'rubber', 'michelin', 'goodyear'] }
            ]
          },
          {
            code: '251020',
            name: 'Automobiles',
            subIndustries: [
              { code: '25102010', name: 'Automobile Manufacturers', keywords: ['automobile', 'cars', 'ford', 'gm', 'tesla', 'toyota'] },
              { code: '25102020', name: 'Motorcycle Manufacturers', keywords: ['motorcycle', 'bikes', 'harley davidson'] }
            ]
          }
        ]
      },
      {
        code: '2520',
        name: 'Consumer Durables & Apparel',
        industries: [
          {
            code: '252010',
            name: 'Household Durables',
            subIndustries: [
              { code: '25201010', name: 'Consumer Electronics', keywords: ['consumer electronics', 'electronics'] },
              { code: '25201020', name: 'Home Furnishings', keywords: ['home furnishings', 'furniture'] },
              { code: '25201030', name: 'Homebuilding', keywords: ['homebuilding', 'home construction'] },
              { code: '25201040', name: 'Household Appliances', keywords: ['appliances', 'whirlpool'] },
              { code: '25201050', name: 'Housewares & Specialties', keywords: ['housewares', 'home specialties'] }
            ]
          },
          {
            code: '252020',
            name: 'Leisure Products',
            subIndustries: [
              { code: '25202010', name: 'Leisure Products', keywords: ['leisure', 'recreational products', 'toys'] }
            ]
          },
          {
            code: '252030',
            name: 'Textiles, Apparel & Luxury Goods',
            subIndustries: [
              { code: '25203010', name: 'Apparel, Accessories & Luxury Goods', keywords: ['apparel', 'luxury goods', 'fashion', 'nike', 'adidas'] },
              { code: '25203020', name: 'Footwear', keywords: ['footwear', 'shoes', 'sneakers'] },
              { code: '25203030', name: 'Textiles', keywords: ['textiles', 'fabrics'] }
            ]
          }
        ]
      },
      {
        code: '2530',
        name: 'Consumer Services',
        industries: [
          {
            code: '253010',
            name: 'Hotels, Restaurants & Leisure',
            subIndustries: [
              { code: '25301010', name: 'Casinos & Gaming', keywords: ['casinos', 'gaming', 'gambling'] },
              { code: '25301020', name: 'Hotels, Resorts & Cruise Lines', keywords: ['hotels', 'resorts', 'cruise lines', 'marriott'] },
              { code: '25301030', name: 'Leisure Facilities', keywords: ['leisure facilities', 'entertainment venues'] },
              { code: '25301040', name: 'Restaurants', keywords: ['restaurants', 'fast food', 'mcdonalds', 'starbucks'] }
            ]
          },
          {
            code: '253020',
            name: 'Diversified Consumer Services',
            subIndustries: [
              { code: '25302010', name: 'Education Services', keywords: ['education services', 'schools', 'universities'] },
              { code: '25302020', name: 'Specialized Consumer Services', keywords: ['specialized consumer services'] }
            ]
          }
        ]
      },
      {
        code: '2540',
        name: 'Retailing',
        industries: [
          {
            code: '254010',
            name: 'Distributors',
            subIndustries: [
              { code: '25401010', name: 'Distributors', keywords: ['distributors', 'wholesale'] }
            ]
          },
          {
            code: '254020',
            name: 'Internet & Direct Marketing Retail',
            subIndustries: [
              { code: '25402010', name: 'Internet & Direct Marketing Retail', keywords: ['e-commerce', 'online retail', 'amazon', 'internet retail'] }
            ]
          },
          {
            code: '254030',
            name: 'Multiline Retail',
            subIndustries: [
              { code: '25403010', name: 'Department Stores', keywords: ['department stores', 'macy'] },
              { code: '25403020', name: 'General Merchandise Stores', keywords: ['general merchandise', 'walmart', 'target'] }
            ]
          },
          {
            code: '254040',
            name: 'Specialty Retail',
            subIndustries: [
              { code: '25404010', name: 'Apparel Retail', keywords: ['apparel retail', 'clothing stores'] },
              { code: '25404020', name: 'Computer & Electronics Retail', keywords: ['electronics retail', 'best buy'] },
              { code: '25404030', name: 'Home Improvement Retail', keywords: ['home improvement', 'home depot', 'lowes'] },
              { code: '25404040', name: 'Specialty Stores', keywords: ['specialty retail', 'specialty stores'] },
              { code: '25404050', name: 'Automotive Retail', keywords: ['automotive retail', 'auto dealers'] },
              { code: '25404060', name: 'Homefurnishing Retail', keywords: ['home furnishing retail', 'furniture stores'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '30',
    name: 'Consumer Staples',
    description: 'Companies in the consumer staples sector manufacture and sell products and services that people use in everyday life.',
    industryGroups: [
      {
        code: '3010',
        name: 'Food & Staples Retailing',
        industries: [
          {
            code: '301010',
            name: 'Food & Staples Retailing',
            subIndustries: [
              { code: '30101010', name: 'Drug Retail', keywords: ['drug retail', 'pharmacy', 'cvs', 'walgreens'] },
              { code: '30101020', name: 'Food Distributors', keywords: ['food distributors', 'food wholesale'] },
              { code: '30101030', name: 'Food Retail', keywords: ['food retail', 'supermarkets', 'grocery stores'] },
              { code: '30101040', name: 'Hypermarkets & Super Centers', keywords: ['hypermarkets', 'super centers', 'costco'] }
            ]
          }
        ]
      },
      {
        code: '3020',
        name: 'Food, Beverage & Tobacco',
        industries: [
          {
            code: '302010',
            name: 'Beverages',
            subIndustries: [
              { code: '30201010', name: 'Brewers', keywords: ['brewers', 'beer', 'anheuser busch'] },
              { code: '30201020', name: 'Distillers & Vintners', keywords: ['distillers', 'vintners', 'alcohol', 'wine', 'spirits'] },
              { code: '30201030', name: 'Soft Drinks', keywords: ['soft drinks', 'coca cola', 'pepsi'] }
            ]
          },
          {
            code: '302020',
            name: 'Food Products',
            subIndustries: [
              { code: '30202010', name: 'Agricultural Products', keywords: ['agricultural products', 'farming'] },
              { code: '30202020', name: 'Meat, Poultry & Fish', keywords: ['meat', 'poultry', 'fish', 'tyson'] },
              { code: '30202030', name: 'Packaged Foods & Meats', keywords: ['packaged foods', 'processed foods', 'kraft', 'nestle'] }
            ]
          },
          {
            code: '302030',
            name: 'Tobacco',
            subIndustries: [
              { code: '30203010', name: 'Tobacco', keywords: ['tobacco', 'cigarettes', 'philip morris'] }
            ]
          }
        ]
      },
      {
        code: '3030',
        name: 'Household & Personal Products',
        industries: [
          {
            code: '303010',
            name: 'Household Products',
            subIndustries: [
              { code: '30301010', name: 'Household Products', keywords: ['household products', 'cleaning products', 'procter gamble'] }
            ]
          },
          {
            code: '303020',
            name: 'Personal Products',
            subIndustries: [
              { code: '30302010', name: 'Personal Products', keywords: ['personal products', 'cosmetics', 'personal care'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '35',
    name: 'Health Care',
    description: 'Companies in the healthcare sector provide medical services, manufacture medical equipment or drugs, provide medical insurance, or otherwise facilitate the provision of healthcare.',
    industryGroups: [
      {
        code: '3510',
        name: 'Health Care Equipment & Services',
        industries: [
          {
            code: '351010',
            name: 'Health Care Equipment & Supplies',
            subIndustries: [
              { code: '35101010', name: 'Health Care Equipment', keywords: ['medical equipment', 'medical devices'] },
              { code: '35101020', name: 'Health Care Supplies', keywords: ['medical supplies', 'healthcare supplies'] }
            ]
          },
          {
            code: '351020',
            name: 'Health Care Providers & Services',
            subIndustries: [
              { code: '35102010', name: 'Health Care Distributors', keywords: ['healthcare distributors', 'medical distributors'] },
              { code: '35102015', name: 'Health Care Services', keywords: ['healthcare services', 'medical services'] },
              { code: '35102020', name: 'Health Care Facilities', keywords: ['hospitals', 'healthcare facilities'] },
              { code: '35102030', name: 'Managed Health Care', keywords: ['managed healthcare', 'health insurance', 'hmo'] }
            ]
          },
          {
            code: '351030',
            name: 'Health Care Technology',
            subIndustries: [
              { code: '35103010', name: 'Health Care Technology', keywords: ['healthcare technology', 'medical technology', 'health tech'] }
            ]
          }
        ]
      },
      {
        code: '3520',
        name: 'Pharmaceuticals, Biotechnology & Life Sciences',
        industries: [
          {
            code: '352010',
            name: 'Biotechnology',
            subIndustries: [
              { code: '35201010', name: 'Biotechnology', keywords: ['biotechnology', 'biotech', 'biogen', 'genentech'] }
            ]
          },
          {
            code: '352020',
            name: 'Pharmaceuticals',
            subIndustries: [
              { code: '35202010', name: 'Pharmaceuticals', keywords: ['pharmaceuticals', 'drugs', 'pfizer', 'johnson johnson', 'merck'] }
            ]
          },
          {
            code: '352030',
            name: 'Life Sciences Tools & Services',
            subIndustries: [
              { code: '35203010', name: 'Life Sciences Tools & Services', keywords: ['life sciences', 'research tools', 'laboratory equipment'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '40',
    name: 'Financials',
    description: 'Companies in the financial sector provide financial services including banking, investment services, insurance, real estate, and other financial services.',
    industryGroups: [
      {
        code: '4010',
        name: 'Banks',
        industries: [
          {
            code: '401010',
            name: 'Banks',
            subIndustries: [
              { code: '40101010', name: 'Diversified Banks', keywords: ['banks', 'banking', 'jpmorgan', 'bank of america', 'wells fargo'] },
              { code: '40101015', name: 'Regional Banks', keywords: ['regional banks', 'community banks'] }
            ]
          }
        ]
      },
      {
        code: '4020',
        name: 'Diversified Financials',
        industries: [
          {
            code: '402010',
            name: 'Diversified Financial Services',
            subIndustries: [
              { code: '40201010', name: 'Diversified Financial Services', keywords: ['diversified financial', 'financial conglomerates'] },
              { code: '40201020', name: 'Multi-Sector Holdings', keywords: ['multi sector holdings', 'financial holdings'] },
              { code: '40201030', name: 'Specialized Finance', keywords: ['specialized finance', 'consumer finance'] }
            ]
          },
          {
            code: '402020',
            name: 'Consumer Finance',
            subIndustries: [
              { code: '40202010', name: 'Consumer Finance', keywords: ['consumer finance', 'credit cards', 'personal loans'] }
            ]
          },
          {
            code: '402030',
            name: 'Capital Markets',
            subIndustries: [
              { code: '40203010', name: 'Asset Management & Custody Banks', keywords: ['asset management', 'custody banks', 'blackrock'] },
              { code: '40203020', name: 'Investment Banking & Brokerage', keywords: ['investment banking', 'brokerage', 'goldman sachs', 'morgan stanley'] },
              { code: '40203030', name: 'Diversified Capital Markets', keywords: ['capital markets', 'securities'] },
              { code: '40203040', name: 'Financial Exchanges & Data', keywords: ['exchanges', 'financial data', 'bloomberg'] }
            ]
          },
          {
            code: '402040',
            name: 'Mortgage Real Estate Investment Trusts (REITs)',
            subIndustries: [
              { code: '40204010', name: 'Mortgage REITs', keywords: ['mortgage reits', 'mortgage investment trusts'] }
            ]
          }
        ]
      },
      {
        code: '4030',
        name: 'Insurance',
        industries: [
          {
            code: '403010',
            name: 'Insurance',
            subIndustries: [
              { code: '40301010', name: 'Insurance Brokers', keywords: ['insurance brokers', 'insurance services'] },
              { code: '40301020', name: 'Life & Health Insurance', keywords: ['life insurance', 'health insurance'] },
              { code: '40301030', name: 'Multi-line Insurance', keywords: ['multi line insurance', 'diversified insurance'] },
              { code: '40301040', name: 'Property & Casualty Insurance', keywords: ['property insurance', 'casualty insurance', 'auto insurance'] },
              { code: '40301050', name: 'Reinsurance', keywords: ['reinsurance', 'reinsurers'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '45',
    name: 'Information Technology',
    description: 'Companies in the information technology sector provide technology products and services including software, hardware, telecommunications, and semiconductors.',
    industryGroups: [
      {
        code: '4510',
        name: 'Software & Services',
        industries: [
          {
            code: '451020',
            name: 'IT Services',
            subIndustries: [
              { code: '45102010', name: 'IT Consulting & Other Services', keywords: ['it consulting', 'it services', 'accenture'] },
              { code: '45102020', name: 'Data Processing & Outsourced Services', keywords: ['data processing', 'outsourcing', 'cloud services'] }
            ]
          },
          {
            code: '451030',
            name: 'Software',
            subIndustries: [
              { code: '45103010', name: 'Application Software', keywords: ['application software', 'software applications'] },
              { code: '45103020', name: 'Systems Software', keywords: ['systems software', 'operating systems', 'microsoft', 'oracle'] }
            ]
          }
        ]
      },
      {
        code: '4520',
        name: 'Technology Hardware & Equipment',
        industries: [
          {
            code: '452010',
            name: 'Communications Equipment',
            subIndustries: [
              { code: '45201010', name: 'Communications Equipment', keywords: ['communications equipment', 'networking equipment', 'cisco'] }
            ]
          },
          {
            code: '452020',
            name: 'Technology Hardware, Storage & Peripherals',
            subIndustries: [
              { code: '45202010', name: 'Technology Hardware, Storage & Peripherals', keywords: ['computer hardware', 'storage', 'peripherals', 'apple', 'dell'] }
            ]
          },
          {
            code: '452030',
            name: 'Electronic Equipment, Instruments & Components',
            subIndustries: [
              { code: '45203010', name: 'Electronic Equipment & Instruments', keywords: ['electronic equipment', 'instruments'] },
              { code: '45203015', name: 'Electronic Components', keywords: ['electronic components', 'semiconductors'] },
              { code: '45203020', name: 'Electronic Manufacturing Services', keywords: ['electronic manufacturing', 'ems'] },
              { code: '45203030', name: 'Technology Distributors', keywords: ['technology distributors', 'tech distribution'] }
            ]
          }
        ]
      },
      {
        code: '4530',
        name: 'Semiconductors & Semiconductor Equipment',
        industries: [
          {
            code: '453010',
            name: 'Semiconductors & Semiconductor Equipment',
            subIndustries: [
              { code: '45301010', name: 'Semiconductor Equipment', keywords: ['semiconductor equipment', 'chip equipment'] },
              { code: '45301020', name: 'Semiconductors', keywords: ['semiconductors', 'chips', 'intel', 'amd', 'nvidia', 'tsmc'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '50',
    name: 'Communication Services',
    description: 'Companies in the communication services sector provide communication and entertainment services through various media.',
    industryGroups: [
      {
        code: '5010',
        name: 'Communication Services',
        industries: [
          {
            code: '501010',
            name: 'Diversified Telecommunication Services',
            subIndustries: [
              { code: '50101010', name: 'Alternative Carriers', keywords: ['alternative carriers', 'telecom carriers'] },
              { code: '50101020', name: 'Integrated Telecommunication Services', keywords: ['integrated telecom', 'telecommunications', 'verizon', 'att'] }
            ]
          },
          {
            code: '501020',
            name: 'Wireless Telecommunication Services',
            subIndustries: [
              { code: '50102010', name: 'Wireless Telecommunication Services', keywords: ['wireless', 'mobile', 'cellular', 'sprint', 'tmobile'] }
            ]
          }
        ]
      },
      {
        code: '5020',
        name: 'Media & Entertainment',
        industries: [
          {
            code: '502010',
            name: 'Media',
            subIndustries: [
              { code: '50201010', name: 'Advertising', keywords: ['advertising', 'marketing', 'ad agencies'] },
              { code: '50201020', name: 'Broadcasting', keywords: ['broadcasting', 'tv', 'radio'] },
              { code: '50201030', name: 'Cable & Satellite', keywords: ['cable', 'satellite', 'comcast'] },
              { code: '50201040', name: 'Publishing', keywords: ['publishing', 'newspapers', 'magazines'] }
            ]
          },
          {
            code: '502020',
            name: 'Entertainment',
            subIndustries: [
              { code: '50202010', name: 'Movies & Entertainment', keywords: ['movies', 'entertainment', 'disney', 'netflix'] },
              { code: '50202020', name: 'Interactive Home Entertainment', keywords: ['video games', 'gaming', 'interactive entertainment'] }
            ]
          }
        ]
      },
      {
        code: '5030',
        name: 'Interactive Media & Services',
        industries: [
          {
            code: '503010',
            name: 'Interactive Media & Services',
            subIndustries: [
              { code: '50301010', name: 'Interactive Media & Services', keywords: ['interactive media', 'social media', 'google', 'facebook', 'meta', 'alphabet'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '55',
    name: 'Utilities',
    description: 'Companies in the utilities sector provide essential services including electricity, gas, and water.',
    industryGroups: [
      {
        code: '5510',
        name: 'Utilities',
        industries: [
          {
            code: '551010',
            name: 'Electric Utilities',
            subIndustries: [
              { code: '55101010', name: 'Electric Utilities', keywords: ['electric utilities', 'electricity', 'power companies'] }
            ]
          },
          {
            code: '551020',
            name: 'Gas Utilities',
            subIndustries: [
              { code: '55102010', name: 'Gas Utilities', keywords: ['gas utilities', 'natural gas', 'gas companies'] }
            ]
          },
          {
            code: '551030',
            name: 'Multi-Utilities',
            subIndustries: [
              { code: '55103010', name: 'Multi-Utilities', keywords: ['multi utilities', 'diversified utilities'] }
            ]
          },
          {
            code: '551040',
            name: 'Water Utilities',
            subIndustries: [
              { code: '55104010', name: 'Water Utilities', keywords: ['water utilities', 'water companies'] }
            ]
          },
          {
            code: '551050',
            name: 'Independent Power and Renewable Electricity Producers',
            subIndustries: [
              { code: '55105010', name: 'Independent Power Producers & Energy Traders', keywords: ['independent power', 'energy traders'] },
              { code: '55105020', name: 'Renewable Electricity', keywords: ['renewable energy', 'solar', 'wind', 'clean energy'] }
            ]
          }
        ]
      }
    ]
  },
  {
    code: '60',
    name: 'Real Estate',
    description: 'Companies in the real estate sector include Real Estate Investment Trusts (REITs) and companies engaged in real estate development and services.',
    industryGroups: [
      {
        code: '6010',
        name: 'Real Estate',
        industries: [
          {
            code: '601010',
            name: 'Equity Real Estate Investment Trusts (REITs)',
            subIndustries: [
              { code: '60101010', name: 'Diversified REITs', keywords: ['diversified reits', 'real estate investment trusts'] },
              { code: '60101020', name: 'Industrial REITs', keywords: ['industrial reits', 'warehouse reits'] },
              { code: '60101030', name: 'Hotel & Resort REITs', keywords: ['hotel reits', 'resort reits'] },
              { code: '60101040', name: 'Office REITs', keywords: ['office reits', 'commercial real estate'] },
              { code: '60101050', name: 'Health Care REITs', keywords: ['healthcare reits', 'medical real estate'] },
              { code: '60101060', name: 'Residential REITs', keywords: ['residential reits', 'apartment reits'] },
              { code: '60101070', name: 'Retail REITs', keywords: ['retail reits', 'shopping center reits'] },
              { code: '60101080', name: 'Specialized REITs', keywords: ['specialized reits', 'data center reits', 'cell tower reits'] }
            ]
          },
          {
            code: '601020',
            name: 'Real Estate Management & Development',
            subIndustries: [
              { code: '60102010', name: 'Diversified Real Estate Activities', keywords: ['real estate activities', 'real estate services'] },
              { code: '60102020', name: 'Real Estate Operating Companies', keywords: ['real estate operating', 'property management'] },
              { code: '60102030', name: 'Real Estate Development', keywords: ['real estate development', 'property development'] },
              { code: '60102040', name: 'Real Estate Services', keywords: ['real estate services', 'brokerage', 'property services'] }
            ]
          }
        ]
      }
    ]
  }
]

// Common CEDEAR sector mappings based on ticker patterns and company names
export const CEDEAR_SECTOR_MAPPINGS: SectorMapping[] = [
  // Technology
  { ticker: 'AAPL', sector: 'Information Technology', industryGroup: 'Technology Hardware & Equipment', source: 'MANUAL', confidence: 100 },
  { ticker: 'MSFT', sector: 'Information Technology', industryGroup: 'Software & Services', source: 'MANUAL', confidence: 100 },
  { ticker: 'GOOGL', sector: 'Communication Services', industryGroup: 'Interactive Media & Services', source: 'MANUAL', confidence: 100 },
  { ticker: 'GOOG', sector: 'Communication Services', industryGroup: 'Interactive Media & Services', source: 'MANUAL', confidence: 100 },
  { ticker: 'TSLA', sector: 'Consumer Discretionary', industryGroup: 'Automobiles & Components', source: 'MANUAL', confidence: 100 },
  { ticker: 'NVDA', sector: 'Information Technology', industryGroup: 'Semiconductors & Semiconductor Equipment', source: 'MANUAL', confidence: 100 },
  { ticker: 'META', sector: 'Communication Services', industryGroup: 'Interactive Media & Services', source: 'MANUAL', confidence: 100 },
  { ticker: 'AMZN', sector: 'Consumer Discretionary', industryGroup: 'Retailing', source: 'MANUAL', confidence: 100 },
  { ticker: 'NFLX', sector: 'Communication Services', industryGroup: 'Media & Entertainment', source: 'MANUAL', confidence: 100 },
  
  // Financial Services
  { ticker: 'JPM', sector: 'Financials', industryGroup: 'Banks', source: 'MANUAL', confidence: 100 },
  { ticker: 'BAC', sector: 'Financials', industryGroup: 'Banks', source: 'MANUAL', confidence: 100 },
  { ticker: 'WFC', sector: 'Financials', industryGroup: 'Banks', source: 'MANUAL', confidence: 100 },
  { ticker: 'GS', sector: 'Financials', industryGroup: 'Diversified Financials', source: 'MANUAL', confidence: 100 },
  { ticker: 'MS', sector: 'Financials', industryGroup: 'Diversified Financials', source: 'MANUAL', confidence: 100 },
  
  // Healthcare
  { ticker: 'JNJ', sector: 'Health Care', industryGroup: 'Pharmaceuticals, Biotechnology & Life Sciences', source: 'MANUAL', confidence: 100 },
  { ticker: 'PFE', sector: 'Health Care', industryGroup: 'Pharmaceuticals, Biotechnology & Life Sciences', source: 'MANUAL', confidence: 100 },
  { ticker: 'UNH', sector: 'Health Care', industryGroup: 'Health Care Equipment & Services', source: 'MANUAL', confidence: 100 },
  
  // Consumer
  { ticker: 'KO', sector: 'Consumer Staples', industryGroup: 'Food, Beverage & Tobacco', source: 'MANUAL', confidence: 100 },
  { ticker: 'PEP', sector: 'Consumer Staples', industryGroup: 'Food, Beverage & Tobacco', source: 'MANUAL', confidence: 100 },
  { ticker: 'WMT', sector: 'Consumer Staples', industryGroup: 'Food & Staples Retailing', source: 'MANUAL', confidence: 100 },
  { ticker: 'MCD', sector: 'Consumer Discretionary', industryGroup: 'Consumer Services', source: 'MANUAL', confidence: 100 },
  { ticker: 'SBUX', sector: 'Consumer Discretionary', industryGroup: 'Consumer Services', source: 'MANUAL', confidence: 100 },
  
  // Industrial
  { ticker: 'BA', sector: 'Industrials', industryGroup: 'Capital Goods', source: 'MANUAL', confidence: 100 },
  { ticker: 'CAT', sector: 'Industrials', industryGroup: 'Capital Goods', source: 'MANUAL', confidence: 100 },
  { ticker: 'GE', sector: 'Industrials', industryGroup: 'Capital Goods', source: 'MANUAL', confidence: 100 },
  
  // Energy
  { ticker: 'XOM', sector: 'Energy', source: 'MANUAL', confidence: 100 },
  { ticker: 'CVX', sector: 'Energy', source: 'MANUAL', confidence: 100 },
  
  // Materials
  { ticker: 'DD', sector: 'Materials', source: 'MANUAL', confidence: 100 },
  
  // Utilities
  { ticker: 'NEE', sector: 'Utilities', source: 'MANUAL', confidence: 100 }
]

// Utility functions for sector classification
export const getSectorByCode = (code: string): GICSSector | undefined => {
  return GICS_SECTORS.find(sector => sector.code === code)
}

export const getSectorByName = (name: string): GICSSector | undefined => {
  return GICS_SECTORS.find(sector => 
    sector.name.toLowerCase() === name.toLowerCase()
  )
}

export const getIndustryBySector = (sectorCode: string, industryCode: string) => {
  const sector = getSectorByCode(sectorCode)
  if (!sector) return undefined
  
  for (const group of sector.industryGroups) {
    const industry = group.industries.find(ind => ind.code === industryCode)
    if (industry) return industry
  }
  return undefined
}

export const getSectorMappingByTicker = (ticker: string): SectorMapping | undefined => {
  return CEDEAR_SECTOR_MAPPINGS.find(mapping => 
    mapping.ticker.toLowerCase() === ticker.toLowerCase()
  )
}

/**
 * Busca keywords en una industria específica
 */
const searchKeywordsInIndustry = (searchText: string, industry: any): boolean => {
  return industry.subIndustries.some((subIndustry: any) =>
    subIndustry.keywords.some((keyword: string) =>
      searchText.includes(keyword.toLowerCase())
    )
  )
}

/**
 * Busca keywords en un grupo de industrias específico
 */
const searchKeywordsInGroup = (searchText: string, group: any): boolean => {
  return group.industries.some((industry: any) =>
    searchKeywordsInIndustry(searchText, industry)
  )
}

export const findSectorByKeywords = (companyName: string, ticker: string): GICSSector | undefined => {
  const searchText = `${companyName} ${ticker}`.toLowerCase()
  
  // First try exact ticker mapping
  const exactMapping = getSectorMappingByTicker(ticker)
  if (exactMapping) {
    return getSectorByName(exactMapping.sector)
  }
  
  // Then try keyword matching
  return GICS_SECTORS.find(sector =>
    sector.industryGroups.some(group =>
      searchKeywordsInGroup(searchText, group)
    )
  )
}

// Sector balance configuration
export interface SectorBalanceConfig {
  maxConcentration: number          // Maximum percentage in a single sector (25%)
  minSectorCount: number           // Minimum number of sectors (5)
  warningThreshold: number         // Warning threshold percentage (20%)
  criticalThreshold: number        // Critical threshold percentage (30%)
  rebalanceThreshold: number       // Deviation threshold for rebalancing (5%)
}

export const DEFAULT_SECTOR_BALANCE_CONFIG: SectorBalanceConfig = {
  maxConcentration: 25.0,
  minSectorCount: 5,
  warningThreshold: 20.0,
  criticalThreshold: 30.0,
  rebalanceThreshold: 5.0
}

// Color scheme for sectors (for UI visualization)
export const SECTOR_COLORS = {
  'Energy': '#FF6B35',
  'Materials': '#8B4513',
  'Industrials': '#4682B4',
  'Consumer Discretionary': '#32CD32',
  'Consumer Staples': '#9ACD32',
  'Health Care': '#FF69B4',
  'Financials': '#1E90FF',
  'Information Technology': '#9370DB',
  'Communication Services': '#FF4500',
  'Utilities': '#228B22',
  'Real Estate': '#DAA520'
}