'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import API_URL from '@/config'

import { UserOptions as AutoTableUserOptions } from 'jspdf-autotable'

interface AutoTableOptions extends Omit<AutoTableUserOptions, 'theme'> {
    startY: number;
    head: string[][];
    body: string[][];
    theme?: 'striped' | 'grid' | 'plain' | 'css';
}

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: AutoTableOptions) => jsPDF;
        lastAutoTable?: {
            finalY: number;
        };
    }
}

interface Company {
    id?: number;
    gstin?: string;
    legal_name?: string;
    state?: string;
    result?: string;
    fetch_date?: string;
    registration_date?: string;
    last_update?: string;
    trade_name?: string;
    company_type?: string;
    delayed_filling?: string;
    Delay_days?: string;
    address?: string;
    return_status?: string;
    month?: string;
    year?: string;
    date_of_filing?: string;
    return_type?: string;
}

export default function UserDashboard() {
    const [allData, setAllData] = useState<Company[]>([])
    const [displayData, setDisplayData] = useState<Company[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [itemsPerPage] = useState(10)
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({
        legal_name: '',
        gstin: '',
        state: '',
        status: 'all',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [sortConfig, setSortConfig] = useState<{ key: keyof Company; direction: 'ascending' | 'descending' } | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('auth_tokens')
        const userRole = localStorage.getItem('user_role')

        if (!token || userRole !== 'admin') {
            router.push('/')
        } else {
            setIsAuthenticated(true)
            setIsAdmin(true)
            fetchData()
        }
    }, [router])

    const fetchData = async () => {
        try {
            const response = await fetch(`${API_URL}/companies/`)
            if (response.ok) {
                const data: Company[] = await response.json()
                const uniqueData: Company[] = Array.from(new Map(data.map(item => [item.gstin, item])).values())
                setAllData(uniqueData)
            } else {
                console.error("Failed to fetch data")
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        }
    }

    useEffect(() => {
        let filteredData = allData.filter(item =>
            (filters.legal_name === '' || item.legal_name?.toLowerCase().includes(filters.legal_name.toLowerCase())) &&
            (filters.gstin === '' || item.gstin?.toLowerCase().includes(filters.gstin.toLowerCase())) &&
            (filters.state === '' || item.state?.toLowerCase().includes(filters.state.toLowerCase())) &&
            (filters.status === 'all' || item.result === filters.status)
        )

        if (searchQuery) {
            filteredData = filteredData.filter(item =>
                item.gstin?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Apply sorting
        if (sortConfig !== null) {
            filteredData.sort((a, b) => {
                if (a[sortConfig.key] == null && b[sortConfig.key] == null) {
                    return 0;
                }
                if (a[sortConfig.key] == null) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                if (b[sortConfig.key] == null) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key]! < b[sortConfig.key]!) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key]! > b[sortConfig.key]!) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        setDisplayData(filteredData)
        setCurrentPage(1)
    }, [filters, searchQuery, allData, sortConfig])

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = displayData.slice(indexOfFirstItem, indexOfLastItem)

    const filterDataForPDF = async (gstin: string): Promise<Company | null> => {
        try {
            const response = await fetch(`${API_URL}/companies/${gstin}/`)
            if (response.ok) {
                const data = await response.json()
                return data || null
            } else {
                console.error("Failed to fetch company data")
                return null
            }
        } catch (error) {
            console.error("Error fetching company data:", error)
            return null
        }
    }

    const getMonthName = (monthNumber: string): string => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const monthIndex = parseInt(monthNumber, 10) - 1;
        return months[monthIndex] || 'N/A';
    };

    const generatePDF = async (gstin: string) => {
        setIsLoading(true);
        try {
            const items = await filterDataForPDF(gstin);
            console.log("items : ", items);
    
            if (!items) {
                console.error("No data found for the provided GSTIN");
                return;
            }
    
            const doc = new jsPDF();
            doc.setFontSize(14);
            doc.text('COMPANY GST3B SUMMARY', 14, 15);
            doc.setFontSize(10);
    
            const summaryTableData = [
                ['GSTIN', items.gstin || 'N/A', 'STATUS', items.return_status || 'N/A'],
                ['LEGAL NAME', items.legal_name || 'N/A', 'REG. DATE', items.registration_date || 'N/A'],
                ['TRADE NAME', items.trade_name || 'N/A', 'LAST UPDATE DATE', items.last_update || 'N/A'],
                ['COMPANY TYPE', items.company_type || 'N/A', 'STATE', items.state || 'N/A'],
                ['% DELAYED FILLING', items.delayed_filling || 'N/A', 'AVG. DELAY DAYS', items.Delay_days || 'N/A'],
                ['Address', items.address || 'N/A', 'Result', items.result || 'N/A'],
            ];
    
            doc.autoTable({
                startY: 20,
                head: [['', '', '', '']],
                body: summaryTableData,
                theme: 'grid',
                headStyles: { fillColor: [230, 230, 230] },
                styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
                columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 70 }, 2: { cellWidth: 45 }, 3: { cellWidth: 30 } },
            });
    
            const yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 20;
    
            const filingDetails: string[][] = [
                [
                    items.year || 'N/A',
                    items.month || 'N/A',
                    items.return_type || 'N/A',
                    items.date_of_filing || 'N/A',
                    items.delayed_filling || 'N/A',
                    items.Delay_days || 'N/A'
                ]
            ];
    
            const sortedFilingDetails = filingDetails.map(item => [
                item[0],
                getMonthName(item[1]),
                item[2],
                item[3],
                item[4],
                item[5]
            ]);
    
            doc.autoTable({
                startY: yPos,
                head: [['Year', 'Month', 'Return Type', 'Date of Filing', 'Delayed Filing', 'Delay Days']],
                body: sortedFilingDetails,
                theme: 'grid',
                headStyles: { fillColor: [230, 230, 230] },
                styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
                columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 }, 4: { cellWidth: 35 }, 5: { cellWidth: 30 } },
            });
    
            doc.save(`${gstin}_summary.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSort = (key: keyof Company) => {
        setSortConfig(prevConfig => {
            if (!prevConfig || prevConfig.key !== key) {
                return { key, direction: 'ascending' };
            }
            if (prevConfig.direction === 'ascending') {
                return { key, direction: 'descending' };
            }
            return null;
        });
    };

    if (!isAuthenticated || !isAdmin) {
        return <div>Loading...</div>
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <form onSubmit={(e) => e.preventDefault()} className="flex space-x-4 mb-6">
                <Input
                    type="text"
                    placeholder="Enter GST Number"
                    className="flex-grow"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit">Search</Button>
            </form>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                    placeholder="Filter by Company Name"
                    value={filters.legal_name}
                    onChange={(e) => handleFilterChange('legal_name', e.target.value)}
                />
                <Input
                    placeholder="Filter by GSTIN"
                    value={filters.gstin}
                    onChange={(e) => handleFilterChange('gstin', e.target.value)}
                />
                <Input
                    placeholder="Filter by State"
                    value={filters.state}
                    onChange={(e) => handleFilterChange('state', e.target.value)}
                />
                <Select onValueChange={(value) => handleFilterChange('status', value)} value={filters.status}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Pass">Pass</SelectItem>
                        <SelectItem value="Fail">Fail</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead onClick={() => handleSort('legal_name')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Company Name
                                    {sortConfig?.key === 'legal_name'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('gstin')} className="cursor-pointer">
                                <div className="flex items-center">
                                    GSTIN
                                    {sortConfig?.key === 'gstin'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('state')} className="cursor-pointer">
                                <div className="flex items-center">
                                    State
                                    {sortConfig?.key === 'state'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('fetch_date')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Fetch Date
                                    {sortConfig?.key === 'fetch_date'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('Delay_days')} className="
cursor-pointer">
                                <div className="flex items-center">
                                    Delay Days
                                    {sortConfig?.key === 'Delay_days'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('delayed_filling')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Delayed Filling
                                    {sortConfig?.key === 'delayed_filling'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('result')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Status
                                    {sortConfig?.key === 'result'
                                        ? (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)
                                        : <ArrowUpDown className="ml-2 h-4 w-4" />
                                    }
                                </div>
                            </TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.legal_name}</TableCell>
                                <TableCell>{item.gstin}</TableCell>
                                <TableCell>{item.state}</TableCell>
                                <TableCell>{item.fetch_date}</TableCell>
                                <TableCell>{item.Delay_days}</TableCell>
                                <TableCell>{item.delayed_filling}%</TableCell>
                                <TableCell>{item.result}</TableCell>
                                <TableCell>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => generatePDF(item.gstin || '')} 
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Loading...' : 'Download'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-4 flex justify-center space-x-2">
                <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                    Previous
                </Button>
                {Array.from({ length: Math.ceil(displayData.length / itemsPerPage) }).map((_, index) => (
                    <Button
                        key={index}
                        variant={currentPage === index + 1 ? "default" : "outline"}
                        onClick={() => paginate(index + 1)}
                    >
                        {index + 1}
                    </Button>
                ))}
                <Button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === Math.ceil(displayData.length / itemsPerPage)}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

