// Lokasi: /src/components/Pagination/Pagination.js

import React from 'react';
import styles from './Pagination.module.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // Fungsi ini membuat array nomor halaman, termasuk elipsis (...)
  const generatePageNumbers = () => {
    const pages = [];
    // Jika total halaman sedikit, tampilkan semua nomor
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logika untuk menampilkan elipsis jika total halaman banyak
      pages.push(1); // Selalu tampilkan halaman 1
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages); // Selalu tampilkan halaman terakhir
    }
    return pages;
  };

  const pageNumbers = generatePageNumbers();

  // Jika hanya ada satu halaman, jangan tampilkan pagination sama sekali
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={styles.pagination}>
      {/* Tombol Kembali (Previous) */}
      <button 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1}
        className={styles.pageItem}
        aria-label="Halaman Sebelumnya"
      >
        &lt;
      </button>

      {/* Tombol Nomor Halaman */}
      {pageNumbers.map((page, index) =>
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`${styles.pageItem} ${currentPage === page ? styles.active : ''}`}
          >
            {page}
          </button>
        ) : (
          <span key={index} className={styles.ellipsis}>...</span>
        )
      )}

      {/* Tombol Lanjut (Next) */}
      <button 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages}
        className={styles.pageItem}
        aria-label="Halaman Berikutnya"
      >
        &gt;
      </button>
    </nav>
  );
};

export default Pagination;