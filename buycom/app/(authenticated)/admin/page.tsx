'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import API_URL from '@/config'

import { UserOptions as AutoTableUserOptions } from 'jspdf-autotable'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

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

interface CompanyData {
    id?: number;
    gstin?: string;
    legal_name?: string;
    registration_date?: string;
    trade_name?: string;
    last_update?: string;
    company_type?: string;
    state?: string;
    delayed_filling?: string;
    Delay_days?: string;
    return_status?: string;
    address?: string;
    result?: string;
    year?: string;
    month?: string;
    return_type?: string;
    date_of_filing?: string;
    annual_turnover?: number;
    fetch_date?: string;
}

export default function AdminDashboard() {
    const [allData, setAllData] = useState<CompanyData[]>([])
    const [displayData, setDisplayData] = useState<CompanyData[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [newStatus, setNewStatus] = useState<string>('')
    const [newAnnualTurnover, setNewAnnualTurnover] = useState<string>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({
        legal_name: '',
        gstin: '',
        state: '',
        status: 'all',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [sortConfig, setSortConfig] = useState<{ key: keyof CompanyData; direction: 'ascending' | 'descending' } | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('auth_tokens')
        const userRole = localStorage.getItem('user_role')

        if (!token) {
            router.push('/')
        } else if (userRole !== 'admin') {
            router.push('/')
        } else {
            setIsAuthenticated(true)
            setIsAdmin(true)
            fetchData()
        }
    }, [router])

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

        const uniqueData = Array.from(new Map(filteredData.map((item: CompanyData) => [item.gstin, item])).values())
        const sortedData = sortData(uniqueData)

        setDisplayData(sortedData)
        setCurrentPage(1)
    }, [filters, searchQuery, allData, sortConfig])

    const fetchData = async () => {
        try {
            const response = await fetch(`${API_URL}/companies/`)
            if (response.ok) {
                const data = await response.json()
                if (Array.isArray(data)) {
                    setAllData(data)
                    setDisplayData(data)
                } else {
                    console.error("Fetched data is not an array:", data)
                    setAllData([])
                }
            } else {
                console.error("Failed to fetch data")
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        }
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/fetch_and_save_gst_record/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gstin: searchQuery })
            });

            if (response.ok) {
                console.log("Record updated successfully");

                setTimeout(fetchData, 1000);
                setIsLoading(false);
            } else {
                console.error("Failed to update record");
            }
        } catch (error) {
            console.error("Error fetching company details:", error)
        }
    }

    const handleStatusChange = (value: string) => {
        setNewStatus(value)
    }

    const handleAnnualTurnoverChange = (value: string) => {
        setNewAnnualTurnover(value)
    }

    const handleSaveChanges = async () => {
        if (editingId !== null) {
            const selectedItem = allData.find(item => item.id === editingId);
            if (!selectedItem) {
                console.error("Selected item not found");
                return;
            }

            const bodyData = {
                id: editingId,
                gstin: selectedItem.gstin,
                status: newStatus || selectedItem.result,
                annual_turnover: newAnnualTurnover ? parseFloat(newAnnualTurnover) : selectedItem.annual_turnover,
            };

            try {
                setIsLoading(true);
                const response = await fetch(`${API_URL}/update_gst_record/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bodyData),
                });

                if (response.ok) {
                    console.log("Record updated successfully");
                    await fetchData();
                } else {
                    console.error("Failed to update record");
                }
            } catch (error) {
                console.error("Error updating record:", error);
            }
            setIsLoading(false);
            setEditingId(null);
            setNewStatus('');
            setNewAnnualTurnover('');
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const filterDataForPDF = async (gstin: string): Promise<CompanyData | null> => {
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
    
            if (!Array.isArray(items) || items.length === 0) {
                console.error("No data found for the provided GSTIN or array is empty");
                return;
            }
    
            const doc = new jsPDF();
            doc.setFontSize(14);
            doc.text('COMPANY GST3B SUMMARY', 14, 15);
            doc.setFontSize(10);
    
            const summaryTableData = [
                ['GSTIN', items[0].gstin || 'N/A', 'STATUS', items[0].return_status || 'N/A'],
                ['LEGAL NAME', items[0].legal_name || 'N/A', 'REG. DATE', items[0].registration_date || 'N/A'],
                ['TRADE NAME', items[0].trade_name || 'N/A', 'LAST UPDATE DATE', items[0].last_update || 'N/A'],
                ['COMPANY TYPE', items[0].company_type || 'N/A', 'STATE', items[0].state || 'N/A'],
                ['% DELAYED FILLING', items[0].delayed_filling || 'N/A', 'AVG. DELAY DAYS', items[0].Delay_days || 'N/A'],
                ['Address', items[0].address || 'N/A', 'Result', items[0].result || 'N/A'],
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
    
            const filingDetails: string[][] = [];
            items.forEach((item) => {
                if (item) {
                    filingDetails.push([
                        item.year || 'N/A',
                        item.month || 'N/A',
                        item.return_type || 'N/A',
                        item.date_of_filing || 'N/A',
                        item.delayed_filling || 'N/A',
                        item.Delay_days || 'N/A'
                    ]);
                }
            });
    
            filingDetails.sort((a, b) => {
                const yearA = parseInt(a[0], 10);
                const yearB = parseInt(b[0], 10);
                const monthA = parseInt(a[1], 10);
                const monthB = parseInt(b[1], 10);
    
                if (yearA > yearB) return -1;
                if (yearA < yearB) return 1;
    
                if (monthA > monthB) return -1;
                if (monthA < monthB) return 1;
    
                return 0;
            });
    
            if (filingDetails.length > 24) {
                filingDetails.splice(24);
            }
    
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
    

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    const sortData = (data: CompanyData[]) => {
        if (!sortConfig || !sortConfig.key) return data;
        return [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return 1;
            if (bValue === undefined) return -1;

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    };

    const handleSort = (key: keyof CompanyData) => {
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
            <div className="mb-8">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by GSTIN"
                            className="flex-grow"
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <img src="/gif/loading.gif" alt="Loading..." className="w-6 h-6" />
                            ) : (
                                "Add Company"
                            )}
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            type="text"
                            value={filters.legal_name}
                            onChange={(e) => handleFilterChange('legal_name', e.target.value)}
                            placeholder="Legal Name"
                        />
                        <Input
                            type="text"
                            value={filters.gstin}
                            onChange={(e) => handleFilterChange('gstin', e.target.value)}
                            placeholder="GSTIN"
                        />
                        <Input
                            type="text"
                            value={filters.state}
                            onChange={(e) => handleFilterChange('state', e.target.value)}
                            placeholder="State"
                        />
                        <Select
                            value={filters.status}
                            onValueChange={(value) => handleFilterChange('status', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="Pass">Pass</SelectItem>
                                <SelectItem value="Fail">Fail</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </form>
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
                            <TableHead onClick={() => handleSort('annual_turnover')} className="cursor-pointer">
                                <div className="flex items-center">
                                    Annual Turnover (Cr.)
                                    {sortConfig?.key === 'annual_turnover'
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
                        {displayData
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.legal_name}</TableCell>
                                    <TableCell>{item.gstin}</TableCell>
                                    <TableCell>{item.state || ''}</TableCell>
                                    <TableCell>{item.fetch_date}</TableCell>
                                    <TableCell>{item.annual_turnover || ''}</TableCell>
                                    <TableCell>{item.result || ''}</TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={() => generatePDF(item.gstin || '')} className="mr-2" type="submit" disabled={isLoading}>
                                            {isLoading ? (
                                                <img src="/gif/loading.gif" alt="Loading..." className="w-16 h-6" />
                                            ) : (
                                                "Download"
                                            )}
                                        </Button>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" onClick={() => setEditingId(item.id || null)} size="sm">Edit</Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Edit Company Details</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <label htmlFor="status" className="text-right">
                                                            Status
                                                        </label>
                                                        <Select onValueChange={handleStatusChange} defaultValue={item.result}>
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Select status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Pass">Pass</SelectItem>
                                                                <SelectItem value="Fail">Fail</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <label htmlFor="annual_turnover" className="text-right">
                                                            Annual Turnover (Cr.)
                                                        </label>
                                                        <Input
                                                            id="annual_turnover"
                                                            className="col-span-3"
                                                            defaultValue={item.annual_turnover?.toString()}
                                                            onChange={(e) => handleAnnualTurnoverChange(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end space-x-4">
                                                    <Button type="submit" disabled={isLoading} onClick={handleSaveChanges}>
                                                        {isLoading ? (
                                                            <img src="/gif/loading.gif" alt="Loading..." className="w-6 h-6" />
                                                        ) : (
                                                            "Save Changes"
                                                        )}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            <Pagination className="mt-4">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious onClick={() => handlePageChange(Math.max(1, currentPage - 1))} />
                    </PaginationItem>
                    {[...Array(Math.ceil(displayData.length / itemsPerPage))].map((_, index) => (
                        <PaginationItem key={index}>
                            <PaginationLink
                                onClick={() => handlePageChange(index + 1)}
                                isActive={index + 1 === currentPage}
                            >
                                {index + 1}
                            </PaginationLink>
                        </PaginationItem>
                    ))}
                    <PaginationItem>
                        <PaginationNext onClick={() => handlePageChange(Math.min(Math.ceil(displayData.length / itemsPerPage), currentPage + 1))} />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    )
}