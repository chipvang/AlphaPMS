using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AlphaPMS.Infrastructure.Persistence;

public sealed class AlphaPmsDbContextFactory : IDesignTimeDbContextFactory<AlphaPmsDbContext>
{
    public AlphaPmsDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AlphaPmsDbContext>()
            .UseSqlite("Data Source=Data/alphapms-dev.db")
            .Options;
        return new AlphaPmsDbContext(options);
    }
}
