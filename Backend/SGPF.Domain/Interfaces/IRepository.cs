using System.Linq.Expressions;

namespace SGPF.Domain.Interfaces;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id);
    Task<IEnumerable<T>> GetAllAsync(bool asNoTracking = false);
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate, bool asNoTracking = false);
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(Guid id);
    Task AddRangeAsync(IEnumerable<T> entities);
    Task UpdateRangeAsync(IEnumerable<T> entities);
}
